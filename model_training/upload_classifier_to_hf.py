import argparse
import os
from pathlib import Path

from huggingface_hub import HfApi, create_repo


MODEL_CARD = """---
library_name: pytorch
pipeline_tag: image-classification
tags:
  - fundus
  - diabetic-retinopathy
  - medical-imaging
  - efficientnet
license: mit
---

# FundusX EfficientNet-B3 Diabetic Retinopathy Classifier

This repository contains a PyTorch EfficientNet-B3 classifier for research use in diabetic retinopathy screening from retinal fundus images.

## Labels

0. No diabetic retinopathy
1. Mild diabetic retinopathy
2. Moderate diabetic retinopathy
3. Severe diabetic retinopathy
4. Proliferative diabetic retinopathy

## Intended Use

Research, education, and AI-assisted screening prototype development.

## Not Intended For

This model is not a certified medical device and must not be used as the sole basis for diagnosis or treatment.

## Required Validation

Before any clinical workflow, validate on external datasets and conduct ophthalmologist review.
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-id", required=True, help="Example: username/fundusx-efficientnet-b3-dr")
    parser.add_argument("--weights", default="weights/classifier_efficientnet_b3.pth")
    parser.add_argument("--metrics", default="model_training/classifier_metrics.json")
    parser.add_argument("--private", action="store_true")
    args = parser.parse_args()

    token = os.getenv("HF_TOKEN")
    if not token:
        raise RuntimeError("Please set HF_TOKEN with a Hugging Face write token.")

    api = HfApi(token=token)
    create_repo(args.repo_id, repo_type="model", private=args.private, exist_ok=True, token=token)

    weights = Path(args.weights)
    if not weights.exists():
        raise FileNotFoundError(weights)

    api.upload_file(
        path_or_fileobj=str(weights),
        path_in_repo="classifier_efficientnet_b3.pth",
        repo_id=args.repo_id,
        repo_type="model",
    )

    metrics = Path(args.metrics)
    if metrics.exists():
        api.upload_file(
            path_or_fileobj=str(metrics),
            path_in_repo="classifier_metrics.json",
            repo_id=args.repo_id,
            repo_type="model",
        )

    api.upload_file(
        path_or_fileobj=MODEL_CARD.encode("utf-8"),
        path_in_repo="README.md",
        repo_id=args.repo_id,
        repo_type="model",
    )

    print(f"Uploaded model to https://huggingface.co/{args.repo_id}")


if __name__ == "__main__":
    main()
