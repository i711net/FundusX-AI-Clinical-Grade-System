import argparse
import csv
import random
import shutil
from pathlib import Path


CLASS_DIRS = {
    0: "0_no_dr",
    1: "1_mild",
    2: "2_moderate",
    3: "3_severe",
    4: "4_proliferative",
}


def split_rows(rows: list[dict[str, str]], val_ratio: float, test_ratio: float, seed: int):
    random.Random(seed).shuffle(rows)
    test_count = int(len(rows) * test_ratio)
    val_count = int(len(rows) * val_ratio)
    test_rows = rows[:test_count]
    val_rows = rows[test_count : test_count + val_count]
    train_rows = rows[test_count + val_count :]
    return train_rows, val_rows, test_rows


def find_image(image_dir: Path, image_id: str) -> Path:
    for suffix in [".png", ".jpg", ".jpeg"]:
        candidate = image_dir / f"{image_id}{suffix}"
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"Image not found for id_code={image_id}")


def copy_split(rows: list[dict[str, str]], split: str, image_dir: Path, output_dir: Path) -> None:
    for row in rows:
        label = int(row["diagnosis"])
        image_id = row["id_code"]
        source = find_image(image_dir, image_id)
        target = output_dir / split / CLASS_DIRS[label] / source.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    parser.add_argument("--image-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--val-ratio", type=float, default=0.15)
    parser.add_argument("--test-ratio", type=float, default=0.10)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    with Path(args.csv).open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    train_rows, val_rows, test_rows = split_rows(rows, args.val_ratio, args.test_ratio, args.seed)
    image_dir = Path(args.image_dir)
    output_dir = Path(args.output_dir)

    copy_split(train_rows, "train", image_dir, output_dir)
    copy_split(val_rows, "val", image_dir, output_dir)
    copy_split(test_rows, "test", image_dir, output_dir)

    print(f"Train: {len(train_rows)}")
    print(f"Val: {len(val_rows)}")
    print(f"Test: {len(test_rows)}")
    print(f"Prepared dataset at {output_dir}")


if __name__ == "__main__":
    main()
