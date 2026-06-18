"""
Helmet-violation detector (phase 1).

A standalone inference service that pulls frames from the Sticky Board cameras
flagged `aiEnabled`, runs a YOLO model to spot riders without a helmet, and posts
a snapshot of each violation back to the backend API. The backend owns all
storage / RBAC / dashboards; this process only detects and reports.

Flow:
  GET  {API_URL}/violations/sources   (X-Service-Token)  -> [{id, name, rtspUrl}]
  POST {API_URL}/violations/ingest?cameraId=..&...        (X-Service-Token + JPEG body)

One worker thread per camera reads its RTSP stream, samples a few frames per
second, tracks riders (ByteTrack) so the same rider isn't reported repeatedly,
and reports a `no_helmet` detection above the confidence threshold. The set of
cameras is re-synced periodically so enabling/disabling a camera takes effect
without a restart.
"""

import os
import sys
import time
import logging
import threading

import cv2
import requests
from ultralytics import YOLO

# ---- Config (env) ----
API_URL = os.environ.get("API_URL", "http://backend:8081/api/v1").rstrip("/")
SERVICE_TOKEN = os.environ.get("AI_SERVICE_TOKEN", "")
MODEL_PATH = os.environ.get("MODEL_PATH", "/models/helmet.pt")
CONF_THRESHOLD = float(os.environ.get("CONF_THRESHOLD", "0.5"))
SAMPLE_FPS = float(os.environ.get("SAMPLE_FPS", "3"))            # frames/sec to run inference on
SOURCES_REFRESH_SEC = float(os.environ.get("SOURCES_REFRESH_SEC", "30"))
LOCAL_DEDUP_SEC = float(os.environ.get("LOCAL_DEDUP_SEC", "30"))  # don't re-post the same track within this window
# Substrings (case-insensitive) of class names that mean "no helmet" — datasets
# label this differently (no-helmet / without helmet / nohelmet / head ...).
NOHELMET_CLASSES = [
    s.strip().lower()
    for s in os.environ.get("NOHELMET_CLASSES", "no-helmet,no_helmet,without helmet,nohelmet").split(",")
    if s.strip()
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("detector")


def is_no_helmet(name: str) -> bool:
    n = name.lower()
    return any(key in n for key in NOHELMET_CLASSES)


class CameraWorker(threading.Thread):
    """Reads one RTSP stream, detects no-helmet riders, and reports them."""

    def __init__(self, model: YOLO, cam: dict):
        super().__init__(daemon=True)
        self.model = model
        self.cam_id = cam["id"]
        self.name = cam.get("name", self.cam_id)
        self.rtsp_url = cam["rtspUrl"]
        self.stop_event = threading.Event()
        self._last_report = {}  # trackId -> last report timestamp

    def stop(self):
        self.stop_event.set()

    def _should_report(self, track_id) -> bool:
        now = time.time()
        last = self._last_report.get(track_id, 0)
        if now - last < LOCAL_DEDUP_SEC:
            return False
        self._last_report[track_id] = now
        return True

    def _report(self, frame, conf, track_id, xywh):
        ok, buf = cv2.imencode(".jpg", frame)
        if not ok:
            return
        params = {
            "cameraId": self.cam_id,
            "confidence": round(float(conf), 3),
            "bbox": ",".join(str(int(v)) for v in xywh),
        }
        if track_id is not None:
            params["trackId"] = str(track_id)
        try:
            res = requests.post(
                f"{API_URL}/violations/ingest",
                params=params,
                data=buf.tobytes(),
                headers={"X-Service-Token": SERVICE_TOKEN, "Content-Type": "image/jpeg"},
                timeout=10,
            )
            if res.status_code in (200, 201):
                log.info("[%s] reported no-helmet (track=%s, conf=%.2f) -> %s",
                         self.name, track_id, conf, res.json())
            else:
                log.warning("[%s] ingest failed %s: %s", self.name, res.status_code, res.text[:200])
        except requests.RequestException as e:
            log.warning("[%s] ingest error: %s", self.name, e)

    def run(self):
        log.info("[%s] worker starting", self.name)
        interval = 1.0 / SAMPLE_FPS if SAMPLE_FPS > 0 else 0
        while not self.stop_event.is_set():
            cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            if not cap.isOpened():
                log.warning("[%s] cannot open stream, retrying in 5s", self.name)
                time.sleep(5)
                continue
            log.info("[%s] stream opened", self.name)
            last_infer = 0.0
            while not self.stop_event.is_set():
                ok, frame = cap.read()
                if not ok:
                    log.warning("[%s] stream dropped, reconnecting", self.name)
                    break
                now = time.time()
                if now - last_infer < interval:
                    continue
                last_infer = now
                self._process(frame)
            cap.release()
        log.info("[%s] worker stopped", self.name)

    def _process(self, frame):
        try:
            results = self.model.track(
                frame, persist=True, conf=CONF_THRESHOLD, tracker="bytetrack.yaml", verbose=False
            )
        except Exception as e:  # inference must never kill the worker
            log.warning("[%s] inference error: %s", self.name, e)
            return
        r = results[0]
        names = r.names
        if r.boxes is None:
            return
        for box in r.boxes:
            name = names[int(box.cls)]
            if not is_no_helmet(name):
                continue
            conf = float(box.conf)
            track_id = int(box.id) if box.id is not None else None
            if track_id is not None and not self._should_report(track_id):
                continue
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            self._report(frame, conf, track_id, (x1, y1, x2 - x1, y2 - y1))


def fetch_sources():
    res = requests.get(
        f"{API_URL}/violations/sources",
        headers={"X-Service-Token": SERVICE_TOKEN},
        timeout=10,
    )
    res.raise_for_status()
    return res.json()


def main():
    if not SERVICE_TOKEN:
        log.error("AI_SERVICE_TOKEN is not set — refusing to start.")
        sys.exit(1)
    if not os.path.exists(MODEL_PATH):
        log.error("Model not found at %s — set MODEL_PATH to a helmet YOLO weight.", MODEL_PATH)
        sys.exit(1)

    log.info("Loading model %s", MODEL_PATH)
    model = YOLO(MODEL_PATH)
    log.info("Model classes: %s", model.names)

    workers = {}  # cam_id -> CameraWorker
    while True:
        try:
            sources = fetch_sources()
        except requests.RequestException as e:
            log.warning("could not fetch sources: %s", e)
            time.sleep(SOURCES_REFRESH_SEC)
            continue

        wanted = {c["id"]: c for c in sources}

        # Start workers for newly-enabled cameras.
        for cam_id, cam in wanted.items():
            if cam_id not in workers or not workers[cam_id].is_alive():
                w = CameraWorker(model, cam)
                w.start()
                workers[cam_id] = w

        # Stop workers for cameras that are no longer enabled.
        for cam_id in list(workers):
            if cam_id not in wanted:
                log.info("stopping worker for removed camera %s", cam_id)
                workers[cam_id].stop()
                del workers[cam_id]

        time.sleep(SOURCES_REFRESH_SEC)


if __name__ == "__main__":
    main()
