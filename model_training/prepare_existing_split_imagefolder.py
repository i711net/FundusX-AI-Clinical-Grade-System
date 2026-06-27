import argparse
import csv
import shutil
from pathlib import Path


CLASS_DIRS = {
    0: "0_no_dr",
    1: "1_mild",
    2: "2_moderate",
    3: "3_severe",
    4: "4_proliferative",
}

ID_COLUMNS = ["id_code", "id", "image", "image_id", "filename", "file_name"]
LABEL_COLUMNS = ["diagnosis", "label", "level", "grade", "class"]


def detect_column(columns: list[str], candidates: list[str]) -> str | None:
    lower_map = {column.lower(): column for column in columns}
    for candidate in candidates:
        if candidate in lower_map:
            return lower_map[candidate]
    return None


def find_image(image_dir: Path, image_id: str) -> Path:
    raw = Path(image_id)
    candidates = [image_dir / raw.name]
    if raw.suffix:
        candidates.append(image_dir / raw.stem)

    stem = raw.stem if raw.suffix else image_id
    for suffix in [".png", ".jpg", ".jpeg", ".JPG", ".PNG", ".JPEG"]:
        candidates.append(image_dir / f"{stem}{suffix}")

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate

    for candidate in image_dir.rglob(f"{stem}.*"):
        if candidate.is_file() and candidate.suffix.lower() in {".png", ".jpg", ".jpeg"}:
            return candidate

    raise FileNotFoundError(f"Image not found for id={image_id} in {image_dir}")


def prepare_split(csv_path: Path, image_dir: Path, output_dir: Path, split: str) -> int:
    if not csv_path.exists():
        print(f"Skip {split}: CSV not found: {csv_path}")
        return 0
    if not image_dir.exists():
        print(f"Skip {split}: image folder not found: {image_dir}")
        return 0

    with csv_path.open("r", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    if not rows:
        print(f"Skip {split}: CSV is empty")
        return 0

    columns = list(rows[0].keys())
    id_column = detect_column(columns, ID_COLUMNS)
    label_column = detect_column(columns, LABEL_COLUMNS)

    if not id_column:
        raise ValueError(f"Could not detect image id column in {csv_path}. Columns: {columns}")
    if not label_column:
        print(f"Skip {split}: no label column found in {csv_path}. Columns: {columns}")
        return 0

    copied = 0
    for row in rows:
        if row.get(label_column, "") == "":
            continue
        label = int(float(row[label_column]))
        if label not in CLASS_DIRS:
            continue
        source = find_image(image_dir, row[id_column])
        target = output_dir / split / CLASS_DIRS[label] / source.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied += 1

    print(f"{split}: copied {copied} images")
    return copied


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive-dir", required=True, help="Folder containing train_images, val_images, test_images and CSV files")
    parser.add_argument("--output-dir", default="data/fundus_dr")
    parser.add_argument("--train-csv", default="train_1.csv")
    parser.add_argument("--val-csv", default="valid.csv")
    parser.add_argument("--test-csv", default="test.csv")
    parser.add_argument("--train-images", default="train_images")
    parser.add_argument("--val-images", default="val_images")
    parser.add_argument("--test-images", default="test_images")
    args = parser.parse_args()

    archive_dir = Path(args.archive_dir)
    output_dir = Path(args.output_dir)

    prepare_split(archive_dir / args.train_csv, archive_dir / args.train_images, output_dir, "train")
    prepare_split(archive_dir / args.val_csv, archive_dir / args.val_images, output_dir, "val")
    prepare_split(archive_dir / args.test_csv, archive_dir / args.test_images, output_dir, "test")

    print(f"Prepared ImageFolder dataset at {output_dir}")


if __name__ == "__main__":
    main()
