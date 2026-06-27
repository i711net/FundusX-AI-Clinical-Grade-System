import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from sklearn.metrics import RocCurveDisplay
from sklearn.preprocessing import label_binarize


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--predictions", default="experiments/sample_predictions.csv")
    parser.add_argument("--output", default="figures/roc_curve.png")
    args = parser.parse_args()

    df = pd.read_csv(args.predictions)
    y_true = label_binarize(df["y_true"], classes=[0, 1, 2, 3, 4])
    probabilities = df[[f"prob_{i}" for i in range(5)]].to_numpy()

    plt.figure(figsize=(7, 6))
    for class_id in range(5):
        RocCurveDisplay.from_predictions(y_true[:, class_id], probabilities[:, class_id], name=f"Class {class_id}")
    plt.title("Multi-class ROC Curves")
    plt.tight_layout()

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output, dpi=300)
    print(f"Saved {output}")


if __name__ == "__main__":
    main()
