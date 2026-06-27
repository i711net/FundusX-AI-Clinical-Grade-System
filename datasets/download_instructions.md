# Dataset Download Instructions

This repository does not redistribute medical images. Download datasets from official sources and follow each dataset license, consent, and ethics requirement.

Recommended datasets:

| Dataset | Use | Notes |
| --- | --- | --- |
| EyePACS | DR classification | Large-scale diabetic retinopathy grading |
| APTOS 2019 | DR classification | Kaggle dataset with five DR grades |
| DDR | Classification and lesions | Useful for lesion-level labels |
| IDRiD | Lesion detection and segmentation | Strong benchmark for lesion localization |
| Messidor-2 | External validation | Common clinical validation dataset |

Suggested local structure:

```text
data/fundus/
├── train/
│   ├── 0_no_dr/
│   ├── 1_mild/
│   ├── 2_moderate/
│   ├── 3_severe/
│   └── 4_proliferative/
├── val/
└── test/
```

YOLO structure:

```text
data/yolo/
├── images/train/
├── images/val/
├── labels/train/
└── labels/val/
```
