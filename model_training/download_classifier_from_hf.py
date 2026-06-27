import argparse
from pathlib import Path

from huggingface_hub import hf_hub_download


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-id", required=True)
    parser.add_argument("--filename", default="classifier_efficientnet_b3.pth")
    parser.add_argument("--output", default="weights/classifier_efficientnet_b3.pth")
    args = parser.parse_args()

    downloaded = hf_hub_download(repo_id=args.repo_id, filename=args.filename, repo_type="model")
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(Path(downloaded).read_bytes())
    print(f"Downloaded {args.repo_id}/{args.filename} to {output}")


if __name__ == "__main__":
    main()
