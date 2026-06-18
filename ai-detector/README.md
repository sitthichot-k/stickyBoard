# AI Detector — helmet violations (phase 1)

A standalone Python service that watches the Sticky Board cameras flagged
**AI helmet detection** and reports riders without a helmet back to the backend.
The backend owns storage, RBAC, and the dashboard; this process only **detects
and reports** — it never touches the database directly.

## How it works

```
            GET /violations/sources            (X-Service-Token)
ai-detector ───────────────────────────────►  backend  →  cameras where aiEnabled=true
   │   one worker thread per camera: open RTSP, sample SAMPLE_FPS, YOLO + ByteTrack
   │
   │   POST /violations/ingest?cameraId=..&confidence=..&trackId=..&bbox=..
   └───────────────────────────────────────►  backend  (JPEG snapshot in the body)
```

- Cameras are re-synced every `SOURCES_REFRESH_SEC`, so toggling **AI helmet
  detection** on a camera takes effect without a restart.
- ByteTrack gives each rider a stable `trackId`; the same rider isn't reported
  again within `LOCAL_DEDUP_SEC` (the backend also de-dupes for 60s).
- A detection counts as a violation when a box's class name matches
  `NOHELMET_CLASSES`, confidence ≥ `CONF_THRESHOLD`, **and** (with rider
  association on) the head belongs to a motorcycle rider.

## Rider association (avoid flagging pedestrians)

A bare-headed **pedestrian** would otherwise be reported as a violation. With
`REQUIRE_MOTORCYCLE=true` (default) a bare head is only flagged when it sits on a
motorcycle — its centre falls within a motorcycle box's horizontal span (±
`ASSOC_MARGIN_X`) and above its base (up to `ASSOC_RISE`× the box height).

Motorcycles are sourced from:
- the **primary model itself**, if it has a `motorcycle`/`motorbike` class, or
- a **separate model** at `MOTO_MODEL_PATH` — e.g. `yolov8n.pt` (COCO, which has
  `motorcycle`; ultralytics auto-downloads it on first use).

If association is on but neither source exists, **nothing is reported** (a clear
warning is logged at startup). Set `MOTO_MODEL_PATH=yolov8n.pt`, use a model with
a motorcycle class, or set `REQUIRE_MOTORCYCLE=false`.

## Model

Phase 1 uses a **pre-trained** helmet YOLO weight — mount it at `MODEL_PATH`
(default `/models/helmet.pt`). Helmet datasets label the "no helmet" class
differently, so set `NOHELMET_CLASSES` to the substring(s) used by your model
(check the `Model classes:` line logged at startup).

## Run

Configured via env (see `.env.example`). In the project it runs as the
`ai-detector` Compose service:

```bash
# put your weights at ./ai-detector/models/helmet.pt (mounted to /models)
docker compose up --build ai-detector
```

`AI_SERVICE_TOKEN` must match the backend's value. GPU is optional but strongly
recommended — see the note at the top of the `Dockerfile` for switching to a
CUDA base image.
