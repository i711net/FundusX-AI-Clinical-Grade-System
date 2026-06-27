import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
from PIL import Image
from torchvision import transforms

from classification_model.model import DR_LABELS, build_model


def load_image(path: str, image_size: int = 512):
    transform = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )
    return transform(Image.open(path).convert("RGB")).unsqueeze(0)


@torch.no_grad()
def classify_image(image_path: str, weights: str | None = None):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(num_classes=5, pretrained=False).to(device)

    if weights and Path(weights).exists():
        checkpoint = torch.load(weights, map_location=device)
        state = checkpoint.get("model_state", checkpoint)
        model.load_state_dict(state)
    else:
        return {"label": "Demo result - model weights missing", "class": 0, "confidence": 0.0, "demo_mode": True}

    model.eval()
    image = load_image(image_path).to(device)
    probabilities = torch.softmax(model(image), dim=1)[0]
    class_id = int(probabilities.argmax().item())
    return {
        "label": DR_LABELS[class_id],
        "class": class_id,
        "confidence": float(probabilities[class_id].item()),
        "demo_mode": False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--weights", default="weights/classifier_efficientnet_b3.pth")
    args = parser.parse_args()
    print(classify_image(args.image, args.weights))


if __name__ == "__main__":
    main()
