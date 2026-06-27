import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from sklearn.metrics import ConfusionMatrixDisplay, confusion_matrix


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--predictions", default="experiments/sample_predictions.csv")
    parser.add_argument("--output", default="figures/confusion_matrix.png")
    args = parser.parse_args()

    df = pd.read_csv(args.predictions)
    matrix = confusion_matrix(df["y_true"], df["y_pred"], labels=[0, 1, 2, 3, 4])
    display = ConfusionMatrixDisplay(matrix, display_labels=["0", "1", "2", "3", "4"])
    display.plot(cmap="Blues")
    plt.title("Confusion Matrix")
    plt.tight_layout()

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output, dpi=300)
    print(f"Saved {output}")


if __name__ == "__main__":
    main()
