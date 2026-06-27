from pathlib import Path
import cv2


def draw_lesion_boxes(image_path: str, lesions: list[dict], output_path: str = "figures/latest_detection.png") -> str:
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")

    for lesion in lesions:
        x1, y1, x2, y2 = [int(v) for v in lesion.get("bbox", [0, 0, 0, 0])]
        label = lesion.get("label", "lesion")
        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 180, 255), 2)
        cv2.putText(image, label, (x1, max(y1 - 8, 16)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 180, 255), 2)

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output), image)
    return str(output)
