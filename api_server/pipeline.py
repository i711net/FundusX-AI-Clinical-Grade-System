import os
from pathlib import Path
from typing import Any

from classification_model.inference import classify_image
from explainability.gradcam import generate_gradcam
from explainability.visualization import draw_lesion_boxes
from yolo_lesion_detection.detect import detect_lesions


def compute_risk(class_result: dict[str, Any], lesions: list[dict[str, Any]]) -> str:
    class_id = int(class_result.get("class", 0))
    lesion_count = len(lesions)
    if class_id >= 3 or lesion_count >= 4:
        return "High"
    if class_id == 2 or lesion_count >= 2:
        return "Moderate"
    return "Low"


def generate_recommendation(risk_level: str) -> str:
    if risk_level == "High":
        return "Recommend urgent ophthalmology review and confirmatory clinical examination."
    if risk_level == "Moderate":
        return "Recommend ophthalmology follow-up and repeat imaging according to local guidelines."
    return "Recommend routine screening follow-up. Clinical judgment remains required."


def full_pipeline(image_path: str) -> dict[str, Any]:
    classifier_weights = os.getenv("FUNDUSX_CLASSIFIER_WEIGHTS", "weights/classifier_efficientnet_b3.pth")
    yolo_weights = os.getenv("FUNDUSX_YOLO_WEIGHTS", "weights/yolo_lesion_detector.pt")

    cls_result = classify_image(image_path, classifier_weights)
    lesions = detect_lesions(image_path, yolo_weights)
    heatmap_path = generate_gradcam(image_path)
    detection_path = draw_lesion_boxes(image_path, lesions)
    risk = compute_risk(cls_result, lesions)

    demo_mode = bool(cls_result.get("demo_mode")) or any(item.get("demo_mode") for item in lesions)

    return {
        "diagnosis": cls_result["label"],
        "class": cls_result.get("class"),
        "confidence": cls_result["confidence"],
        "lesions": lesions,
        "heatmap_path": str(Path(heatmap_path).as_posix()),
        "detection_path": str(Path(detection_path).as_posix()),
        "risk_level": risk,
        "recommendation": generate_recommendation(risk),
        "demo_mode": demo_mode,
    }
