from pathlib import Path
import matplotlib.pyplot as plt


def main():
    settings = ["Baseline CNN", "w/o YOLO", "w/o GradCAM", "Full System"]
    accuracy = [0.88, 0.91, 0.92, 0.96]

    plt.figure(figsize=(7, 5))
    plt.bar(settings, accuracy, color=["#9ca3af", "#60a5fa", "#34d399", "#2563eb"])
    plt.ylim(0.80, 1.00)
    plt.ylabel("Accuracy")
    plt.title("Ablation Study")
    plt.xticks(rotation=15, ha="right")
    plt.tight_layout()

    output = Path("figures/ablation_bar.png")
    output.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output, dpi=300)
    print(f"Saved {output}")


if __name__ == "__main__":
    main()
