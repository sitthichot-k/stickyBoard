# Model weights

Drop your **helmet** YOLO weight here as **`helmet.pt`**, then point the detector
at it with `MODEL_PATH=/models/helmet.pt` (this folder is mounted to `/models`
in the container).

- This folder is git-ignored except for this README — weights are never committed.
- How to get a model + set the right class names: see [../README.md](../README.md)
  → "Getting a model". Inspect any model with `python ../inspect_model.py helmet.pt`.
- You **don't** need a file here for the smoke test (`MODEL_PATH=yolov8n.pt`
  auto-downloads).
