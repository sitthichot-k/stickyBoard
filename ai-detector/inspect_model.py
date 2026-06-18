"""
Inspect a YOLO .pt and print the exact detector env settings to use with it.

The #1 reason the detector "catches nothing" is a class-name mismatch — every
helmet dataset names its classes differently. Run this against any model you
download and it tells you what to put in NOHELMET_CLASSES / HELMET_CLASSES /
VEHICLE_CLASSES (and whether you need a separate MOTO_MODEL_PATH).

    python inspect_model.py [path]      # default: models/helmet.pt
"""

import sys
from ultralytics import YOLO

NO_HELMET = ["no-helmet", "no_helmet", "nohelmet", "without helmet", "head"]
HELMET = ["helmet", "with helmet", "wearing helmet"]
MOTORCYCLE = ["motorcycle", "motorbike"]
VEHICLE = ["motorcycle", "motorbike", "car", "truck", "bus", "bicycle"]


def is_no_helmet(n):
    n = n.lower()
    return any(k in n for k in NO_HELMET)


def matches(names, keys, exclude=None):
    out = []
    for n in names:
        low = n.lower()
        if any(k in low for k in keys) and not (exclude and exclude(n)):
            out.append(n)
    return out


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "models/helmet.pt"
    try:
        model = YOLO(path)
    except Exception as e:
        print(f"Could not load {path}: {e}")
        sys.exit(1)

    names = list(model.names.values())
    print(f"Model: {path}")
    print(f"Classes ({len(names)}): {names}\n")

    no_helmet = matches(names, NO_HELMET)
    helmet = matches(names, HELMET, exclude=is_no_helmet)
    motos = matches(names, MOTORCYCLE)
    vehicles = matches(names, VEHICLE)

    print("Suggested env (copy into your .env):")
    if no_helmet:
        print(f"  NOHELMET_CLASSES={','.join(no_helmet)}")
    else:
        print("  NOHELMET_CLASSES=??   # no obvious 'no-helmet' class — pick it from the list above")
    if helmet:
        print(f"  HELMET_CLASSES={','.join(helmet)}")
    if vehicles:
        print(f"  VEHICLE_CLASSES={','.join(vehicles)}")

    print()
    if not no_helmet:
        print("[!] No no-helmet class detected — this model may not do helmet detection.")
    if motos:
        print("[ok] Has a motorcycle class → REQUIRE_MOTORCYCLE=true works WITHOUT a separate model.")
    else:
        print("[!] No motorcycle class → for rider association set MOTO_MODEL_PATH=yolov8n.pt,")
        print("    or set REQUIRE_MOTORCYCLE=false to flag any bare head.")


if __name__ == "__main__":
    main()
