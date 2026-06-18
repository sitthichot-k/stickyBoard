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

# Rider association — only count a bare head as a violation when it belongs to a
# motorcycle rider, so pedestrians walking past aren't flagged. Motorcycles are
# found either in the primary model's own output or via a separate COCO model
# (MOTO_MODEL_PATH, e.g. "yolov8n.pt"). Set REQUIRE_MOTORCYCLE=false to fall back
# to the naive "any bare head" behaviour.
REQUIRE_MOTORCYCLE = os.environ.get("REQUIRE_MOTORCYCLE", "true").lower() == "true"
MOTO_MODEL_PATH = os.environ.get("MOTO_MODEL_PATH", "")  # optional 2nd model that detects motorcycles
MOTO_CLASSES = [
    s.strip().lower()
    for s in os.environ.get("MOTO_CLASSES", "motorcycle,motorbike").split(",")
    if s.strip()
]
ASSOC_MARGIN_X = float(os.environ.get("ASSOC_MARGIN_X", "0.2"))  # horizontal slack as a fraction of moto width
ASSOC_RISE = float(os.environ.get("ASSOC_RISE", "1.5"))          # how far above the moto (× its height) a rider head may sit

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("detector")


def is_no_helmet(name: str) -> bool:
    n = name.lower()
    return any(key in n for key in NOHELMET_CLASSES)


def is_motorcycle(name: str) -> bool:
    n = name.lower()
    return any(key in n for key in MOTO_CLASSES)


def head_on_motorcycle(head_xyxy, motos) -> bool:
    """True if a bare-head box belongs to a rider: its centre sits within a
    motorcycle's horizontal span (± margin) and above the motorcycle's base
    (riders sit above and roughly over the bike)."""
    hcx = (head_xyxy[0] + head_xyxy[2]) / 2
    hcy = (head_xyxy[1] + head_xyxy[3]) / 2
    for mx1, my1, mx2, my2 in motos:
        w, h = mx2 - mx1, my2 - my1
        if w <= 0 or h <= 0:
            continue
        if (mx1 - ASSOC_MARGIN_X * w) <= hcx <= (mx2 + ASSOC_MARGIN_X * w) and (my1 - ASSOC_RISE * h) <= hcy <= my2:
            return True
    return False


class CameraWorker(threading.Thread):
    """Reads one RTSP stream, detects no-helmet riders, and reports them."""

    def __init__(self, model: YOLO, cam: dict, moto_model: YOLO = None):
        super().__init__(daemon=True)
        self.model = model
        self.moto_model = moto_model  # optional separate motorcycle detector
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

    def _detect_motos(self, frame):
        """Motorcycle boxes from the optional secondary model (xyxy list)."""
        try:
            res = self.moto_model.predict(frame, conf=CONF_THRESHOLD, verbose=False)
        except Exception as e:
            log.warning("[%s] moto inference error: %s", self.name, e)
            return []
        r = res[0]
        if r.boxes is None:
            return []
        return [box.xyxy[0].tolist() for box in r.boxes if is_motorcycle(r.names[int(box.cls)])]

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

        # Collect bare heads + any motorcycles the primary model itself emits.
        heads = []  # (conf, track_id, xyxy)
        motos = []  # xyxy
        for box in r.boxes:
            name = names[int(box.cls)]
            if is_no_helmet(name):
                track_id = int(box.id) if box.id is not None else None
                heads.append((float(box.conf), track_id, box.xyxy[0].tolist()))
            elif is_motorcycle(name):
                motos.append(box.xyxy[0].tolist())

        if not heads:
            return
        if REQUIRE_MOTORCYCLE and self.moto_model is not None:
            motos.extend(self._detect_motos(frame))

        for conf, track_id, xyxy in heads:
            # Skip bare heads that aren't on a motorcycle (e.g. pedestrians).
            if REQUIRE_MOTORCYCLE and not head_on_motorcycle(xyxy, motos):
                continue
            if track_id is not None and not self._should_report(track_id):
                continue
            x1, y1, x2, y2 = xyxy
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

    # Optional secondary model for motorcycle detection (rider association).
    moto_model = None
    primary_has_moto = any(is_motorcycle(n) for n in model.names.values())
    if REQUIRE_MOTORCYCLE:
        if MOTO_MODEL_PATH:
            log.info("Loading motorcycle model %s", MOTO_MODEL_PATH)
            moto_model = YOLO(MOTO_MODEL_PATH)
        elif primary_has_moto:
            log.info("Using the primary model's own motorcycle class for rider association")
        else:
            log.warning(
                "REQUIRE_MOTORCYCLE is on but no motorcycle source is available "
                "(primary model has no motorcycle class and MOTO_MODEL_PATH is unset) "
                "— NO violations will be reported. Set MOTO_MODEL_PATH=yolov8n.pt or "
                "REQUIRE_MOTORCYCLE=false."
            )
    else:
        log.info("Rider association OFF — any bare head counts (pedestrians may be flagged)")

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
                w = CameraWorker(model, cam, moto_model)
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
