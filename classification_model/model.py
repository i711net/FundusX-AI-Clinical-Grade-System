import torch.nn as nn
import timm


DR_LABELS = [
    "No diabetic retinopathy",
    "Mild diabetic retinopathy",
    "Moderate diabetic retinopathy",
    "Severe diabetic retinopathy",
    "Proliferative diabetic retinopathy",
]


def build_model(num_classes: int = 5, pretrained: bool = True):
    model = timm.create_model("efficientnet_b3", pretrained=pretrained)
    in_features = model.classifier.in_features
    model.classifier = nn.Linear(in_features, num_classes)
    return model
