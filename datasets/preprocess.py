from pathlib import Path
import argparse
import cv2


def preprocess_image(src: Path, dst: Path, size: int) -> None:
    image = cv2.imread(str(src))
    if image is None:
        raise ValueError(f"Could not read image: {src}")
    image = cv2.resize(image, (size, size), interpolation=cv2.INTER_AREA)
    dst.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(dst), image)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--size", type=int, default=512)
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    image_paths = list(input_dir.rglob("*.jpg")) + list(input_dir.rglob("*.png")) + list(input_dir.rglob("*.jpeg"))

    for path in image_paths:
        relative = path.relative_to(input_dir)
        preprocess_image(path, output_dir / relative, args.size)

    print(f"Processed {len(image_paths)} images into {output_dir}")


if __name__ == "__main__":
    main()
