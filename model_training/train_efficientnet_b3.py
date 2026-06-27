import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score
from torch.optim import AdamW
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
from tqdm.auto import tqdm

from classification_model.model import DR_LABELS, build_model


def build_transform(image_size: int, train: bool):
    if train:
        return transforms.Compose(
            [
                transforms.Resize((image_size, image_size)),
                transforms.RandomHorizontalFlip(),
                transforms.RandomRotation(12),
                transforms.ColorJitter(brightness=0.12, contrast=0.12, saturation=0.08),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]
        )
    return transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )


def loader(data_dir: Path, split: str, image_size: int, batch_size: int, workers: int):
    dataset = datasets.ImageFolder(data_dir / split, transform=build_transform(image_size, split == "train"))
    return DataLoader(dataset, batch_size=batch_size, shuffle=split == "train", num_workers=workers), dataset


def train_epoch(model, data_loader, criterion, optimizer, device):
    model.train()
    total_loss = 0.0
    y_true = []
    y_pred = []

    for images, labels in tqdm(data_loader, desc="Training", leave=False):
        images = images.to(device)
        labels = labels.to(device)
        optimizer.zero_grad()
        logits = model(images)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        y_true.extend(labels.detach().cpu().tolist())
        y_pred.extend(logits.argmax(dim=1).detach().cpu().tolist())

    return total_loss / max(len(y_true), 1), accuracy_score(y_true, y_pred)


@torch.no_grad()
def evaluate(model, data_loader, criterion, device):
    model.eval()
    total_loss = 0.0
    y_true = []
    y_pred = []
    y_prob = []

    for images, labels in tqdm(data_loader, desc="Evaluating", leave=False):
        images = images.to(device)
        labels = labels.to(device)
        logits = model(images)
        loss = criterion(logits, labels)
        probabilities = torch.softmax(logits, dim=1)

        total_loss += loss.item() * images.size(0)
        y_true.extend(labels.detach().cpu().tolist())
        y_pred.extend(logits.argmax(dim=1).detach().cpu().tolist())
        y_prob.extend(probabilities.detach().cpu().tolist())

    metrics = {
        "loss": total_loss / max(len(y_true), 1),
        "accuracy": accuracy_score(y_true, y_pred),
        "classification_report": classification_report(y_true, y_pred, output_dict=True, zero_division=0),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }
    try:
        metrics["macro_auc_ovr"] = roc_auc_score(y_true, y_prob, multi_class="ovr")
    except ValueError:
        metrics["macro_auc_ovr"] = None
    return metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--image-size", type=int, default=512)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--output", default="weights/classifier_efficientnet_b3.pth")
    parser.add_argument("--metrics-output", default="model_training/classifier_metrics.json")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    if device.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    else:
        print("CUDA is not available. Training will run on CPU and may be very slow.")
    data_dir = Path(args.data_dir)
    train_loader, train_dataset = loader(data_dir, "train", args.image_size, args.batch_size, args.workers)
    val_loader, _ = loader(data_dir, "val", args.image_size, args.batch_size, args.workers)
    test_loader, _ = loader(data_dir, "test", args.image_size, args.batch_size, args.workers)

    model = build_model(num_classes=5, pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = AdamW(model.parameters(), lr=args.learning_rate, weight_decay=1e-4)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    best_val_acc = 0.0
    history = []

    for epoch in range(args.epochs):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_metrics = evaluate(model, val_loader, criterion, device)
        history.append(
            {
                "epoch": epoch + 1,
                "train_loss": train_loss,
                "train_accuracy": train_acc,
                "val_loss": val_metrics["loss"],
                "val_accuracy": val_metrics["accuracy"],
                "val_macro_auc_ovr": val_metrics["macro_auc_ovr"],
            }
        )
        print(history[-1])

        if val_metrics["accuracy"] > best_val_acc:
            best_val_acc = val_metrics["accuracy"]
            torch.save(
                {
                    "model_state": model.state_dict(),
                    "labels": DR_LABELS,
                    "class_to_idx": train_dataset.class_to_idx,
                    "image_size": args.image_size,
                    "architecture": "efficientnet_b3",
                    "val_accuracy": best_val_acc,
                },
                output,
            )

    checkpoint = torch.load(output, map_location=device)
    model.load_state_dict(checkpoint["model_state"])
    test_metrics = evaluate(model, test_loader, criterion, device)

    metrics = {
        "best_val_accuracy": best_val_acc,
        "test": test_metrics,
        "history": history,
        "labels": DR_LABELS,
        "class_to_idx": train_dataset.class_to_idx,
    }
    metrics_output = Path(args.metrics_output)
    metrics_output.parent.mkdir(parents=True, exist_ok=True)
    metrics_output.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Saved weights to {output}")
    print(f"Saved metrics to {metrics_output}")


if __name__ == "__main__":
    main()
