#!/usr/bin/env bash
# Download a helmet YOLO weight into models/helmet.pt, then inspect its classes.
#
#   ./fetch_model.sh <URL> [dest]
#   HELMET_MODEL_URL=<URL> ./fetch_model.sh
#
# Pick a model you trust + whose licence you've checked (see README). This script
# just downloads it — it does NOT bundle any weights.
set -euo pipefail

URL="${1:-${HELMET_MODEL_URL:-}}"
DEST="${2:-models/helmet.pt}"

if [ -z "$URL" ]; then
  echo "usage: ./fetch_model.sh <URL> [dest]   (or set HELMET_MODEL_URL)"
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
echo "Downloading -> $DEST"
curl -fL "$URL" -o "$DEST"
echo "Saved $(du -h "$DEST" | cut -f1) -> $DEST"

if command -v python >/dev/null 2>&1; then
  echo "Inspecting classes..."
  python inspect_model.py "$DEST" || true
else
  echo "Run 'python inspect_model.py $DEST' to see its classes + suggested env."
fi
