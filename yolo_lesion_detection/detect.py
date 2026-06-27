from pathlib import Path
from typing import Any


LESION_LABELS = ["microaneurysm", "hemorrhage", "exudate", "neovascularization"]


def detect_lesions(image_path: str, weights: str | None = None) -> list[dict[str, Any]]:
    if not weights or not Path(weights).exists():
        return [
            {
                "label": "demo_exudate",
                "confidence": 0.0,
                "bbox": [120, 120, 220, 210],
                "demo_mode": True,
            }
        ]

    from ultralytics import YOLO

    model = YOLO(weights)
    results = model.predict(image_path, verbose=False)
    detections: list[dict[str, Any]] = []
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls.item())
            detections.append(
                {
                    "label": LESION_LABELS[class_id] if class_id < len(LESION_LABELS) else str(class_id),
                    "confidence": float(box.conf.item()),
                    "bbox": [float(x) for x in box.xyxy[0].tolist()],
                    "demo_mode": False,
                }
            )
    return detections
