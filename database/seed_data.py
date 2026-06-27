import csv
from pathlib import Path


def write_quiz_seed(output: str = "database/quiz_seed.csv", count: int = 100) -> None:
    path = Path(output)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["image_id", "image_url", "reference_grade"])
        for index in range(1, count + 1):
            writer.writerow([f"fundus_{index:03d}", f"/sample_images/fundus_{index:03d}.jpg", ""])
    print(f"Wrote {count} quiz seed rows to {path}")


if __name__ == "__main__":
    write_quiz_seed()
