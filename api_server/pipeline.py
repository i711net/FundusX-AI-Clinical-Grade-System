import os
from pathlib import Path
from uuid import uuid4
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
    figure_dir = Path(os.getenv("FUNDUSX_FIGURE_DIR", "figures"))
    figure_dir.mkdir(parents=True, exist_ok=True)
    run_id = uuid4().hex
    heatmap_output = figure_dir / f"{run_id}_gradcam.png"
    detection_output = figure_dir / f"{run_id}_detection.png"

    cls_result = classify_image(image_path, classifier_weights)
    lesions = detect_lesions(image_path, yolo_weights)
    generate_gradcam(image_path, str(heatmap_output))
    draw_lesion_boxes(image_path, lesions, str(detection_output))
    risk = compute_risk(cls_result, lesions)

    classifier_demo_mode = bool(cls_result.get("demo_mode"))
    lesion_demo_mode = any(item.get("demo_mode") for item in lesions)

    return {
        "diagnosis": cls_result["label"],
        "class": cls_result.get("class"),
        "confidence": cls_result["confidence"],
        "lesions": lesions,
        "heatmap_path": f"figures/{heatmap_output.name}",
        "detection_path": f"figures/{detection_output.name}",
        "risk_level": risk,
        "recommendation": generate_recommendation(risk),
        "classifier_demo_mode": classifier_demo_mode,
        "lesion_demo_mode": lesion_demo_mode,
        "demo_mode": classifier_demo_mode or lesion_demo_mode,
    }
