# Helmet-violation detector. CPU image by default; for GPU swap the base for an
# NVIDIA CUDA runtime and install the matching torch wheels, then run the service
# with the nvidia runtime + `gpus: all` in compose.
FROM python:3.11-slim

# OpenCV (headless) + ffmpeg for RTSP decoding.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY detector.py inspect_model.py tracker.yaml ./

# Model weights are mounted at runtime (see MODEL_PATH / the compose volume).
# Inspect a mounted model:  docker compose run --rm ai-detector python inspect_model.py /models/helmet.pt
CMD ["python", "-u", "detector.py"]
