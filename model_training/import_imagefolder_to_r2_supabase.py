import argparse
import io
import os
import random
from pathlib import Path

import boto3
from PIL import Image, ImageOps
from supabase import create_client


GRADE_LABELS = {
    0: "No diabetic retinopathy",
    1: "Mild diabetic retinopathy",
    2: "Moderate diabetic retinopathy",
    3: "Severe diabetic retinopathy",
    4: "Proliferative diabetic retinopathy",
}

CLASS_DIR_TO_GRADE = {
    "0_no_dr": 0,
    "1_mild": 1,
    "2_moderate": 2,
    "3_severe": 3,
    "4_proliferative": 4,
}

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


def iter_imagefolder(data_dir: Path, splits: list[str]):
    for split in splits:
        split_dir = data_dir / split
        if not split_dir.exists():
            continue
        for class_dir, grade in CLASS_DIR_TO_GRADE.items():
            folder = split_dir / class_dir
            if not folder.exists():
                continue
            for image_path in folder.rglob("*"):
                if image_path.is_file() and image_path.suffix.lower() in IMAGE_SUFFIXES:
                    yield split, grade, image_path


def compress_image(image_path: Path, max_size: int, quality: int) -> bytes:
    with Image.open(image_path) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=quality, optimize=True, progressive=True)
        return output.getvalue()


def build_r2_client():
    account_id = required_env("R2_ACCOUNT_ID")
    access_key_id = required_env("R2_ACCESS_KEY_ID")
    secret_access_key = required_env("R2_SECRET_ACCESS_KEY")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        region_name="auto",
    )


def build_public_url(key: str) -> str:
    public_base_url = required_env("R2_PUBLIC_BASE_URL").rstrip("/")
    return f"{public_base_url}/{key}"


def build_supabase_client():
    url = required_env("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not key:
        raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    return create_client(url, key)


def make_image_code(split: str, image_path: Path) -> str:
    return f"APTOS-{split.upper()}-{image_path.stem}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data/fundus_dr")
    parser.add_argument("--splits", default="train,val,test")
    parser.add_argument("--r2-prefix", default="fundus-images/aptos2019")
    parser.add_argument("--max-size", type=int, default=900)
    parser.add_argument("--quality", type=int, default=82)
    parser.add_argument("--limit", type=int, default=0, help="0 means no limit")
    parser.add_argument("--shuffle", action="store_true", help="Shuffle before applying --limit, useful for small test imports")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-supabase", action="store_true")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    splits = [item.strip() for item in args.splits.split(",") if item.strip()]
    items = list(iter_imagefolder(data_dir, splits))
    if args.shuffle:
        random.Random(args.seed).shuffle(items)
    if args.limit:
        items = items[: args.limit]

    if not items:
        raise RuntimeError(f"No images found under {data_dir} for splits={splits}")

    print(f"Found {len(items)} images")
    print(f"Compression: max_size={args.max_size}, quality={args.quality}")

    if args.dry_run:
        original_total = 0
        compressed_total = 0
        for _, _, image_path in items[: min(len(items), 100)]:
            original_total += image_path.stat().st_size
            compressed_total += len(compress_image(image_path, args.max_size, args.quality))
        sample_count = min(len(items), 100)
        print(f"Dry run sampled {sample_count} images")
        print(f"Average original KB: {original_total / max(sample_count, 1) / 1024:.1f}")
        print(f"Average compressed KB: {compressed_total / max(sample_count, 1) / 1024:.1f}")
        print(f"Estimated compressed total MB: {(compressed_total / max(sample_count, 1) * len(items)) / 1024 / 1024:.1f}")
        return

    r2 = build_r2_client()
    bucket = required_env("R2_BUCKET_NAME")
    supabase = None if args.skip_supabase else build_supabase_client()

    for index, (split, grade, image_path) in enumerate(items, start=1):
        image_code = make_image_code(split, image_path)
        key = f"{args.r2_prefix.strip('/')}/{split}/{grade}/{image_code}.jpg"
        body = compress_image(image_path, args.max_size, args.quality)

        r2.put_object(
            Bucket=bucket,
            Key=key,
            Body=body,
            ContentType="image/jpeg",
        )

        if supabase:
            record = {
                "image_url": build_public_url(key),
                "storage_key": key,
                "image_code": image_code,
                "image_type": "quiz",
                "title": image_code,
                "diagnosis_label": GRADE_LABELS[grade],
                "disease_grade": grade,
                "is_active": True,
                "metadata": {
                    "source": "APTOS2019",
                    "split": split,
                    "original_filename": image_path.name,
                    "compressed_quality": args.quality,
                    "compressed_max_size": args.max_size,
                },
            }
            existing = (
                supabase.table("fundus_images")
                .select("id")
                .eq("image_code", image_code)
                .limit(1)
                .execute()
            )
            if existing.data:
                supabase.table("fundus_images").update(record).eq("image_code", image_code).execute()
            else:
                supabase.table("fundus_images").insert(record).execute()

        if index % 25 == 0 or index == len(items):
            print(f"Imported {index}/{len(items)} images")

    print("Done. Images are ready for /quiz random sampling.")


if __name__ == "__main__":
    main()
