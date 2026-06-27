import argparse
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--predictions", default="experiments/sample_predictions.csv")
    args = parser.parse_args()

    df = pd.read_csv(args.predictions)
    prob_cols = [f"prob_{i}" for i in range(5)]
    acc = accuracy_score(df["y_true"], df["y_pred"])
    auc = roc_auc_score(df["y_true"], df[prob_cols], multi_class="ovr")

    print(f"Accuracy: {acc:.4f}")
    print(f"Macro AUC: {auc:.4f}")
    print(classification_report(df["y_true"], df["y_pred"]))


if __name__ == "__main__":
    main()
