import os
import sys
from pathlib import Path

from huggingface_hub import hf_hub_download

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def download_weight(repo_id: str | None, filename: str, output: Path, token: str | None) -> bool:
    if not repo_id:
        return False

    output.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading weight from Hugging Face: {repo_id}/{filename}")
    downloaded = hf_hub_download(
        repo_id=repo_id,
        filename=filename,
        repo_type="model",
        token=token,
    )
    output.write_bytes(Path(downloaded).read_bytes())
    print(f"Saved weight to {output}")
    return True


def ensure_classifier_weights() -> None:
    repo_id = os.getenv("HF_MODEL_REPO_ID")
    filename = os.getenv("HF_MODEL_FILENAME", "classifier_efficientnet_b3.pth")
    configured_output = os.getenv("FUNDUSX_CLASSIFIER_WEIGHTS", "/tmp/fundusx/weights/classifier_efficientnet_b3.pth")
    output = Path(configured_output)

    if configured_output.strip() in {"", "."} or output.is_dir():
        output = Path("/tmp/fundusx/weights/classifier_efficientnet_b3.pth")
        os.environ["FUNDUSX_CLASSIFIER_WEIGHTS"] = str(output)

    if output.exists():
        print(f"Classifier weights already exist: {output}")
        return

    if not repo_id:
        print("HF_MODEL_REPO_ID is not set. API will run in demo mode.")
        return

    try:
        output.parent.mkdir(parents=True, exist_ok=True)
    except OSError:
        output = Path("/tmp/fundusx/weights/classifier_efficientnet_b3.pth")
        os.environ["FUNDUSX_CLASSIFIER_WEIGHTS"] = str(output)
        output.parent.mkdir(parents=True, exist_ok=True)
    download_weight(repo_id, filename, output, os.getenv("HF_TOKEN"))


def ensure_yolo_weights() -> None:
    repo_id = os.getenv("HF_YOLO_REPO_ID") or os.getenv("HF_MODEL_REPO_ID")
    filename = os.getenv("HF_YOLO_FILENAME")
    if not filename:
        print("HF_YOLO_FILENAME is not set. Lesion detection will run in demo mode.")
        return

    configured_output = os.getenv("FUNDUSX_YOLO_WEIGHTS", "/tmp/fundusx/weights/yolo_lesion_detector.pt")
    output = Path(configured_output)
    if configured_output.strip() in {"", "."} or output.is_dir():
        output = Path("/tmp/fundusx/weights/yolo_lesion_detector.pt")
        os.environ["FUNDUSX_YOLO_WEIGHTS"] = str(output)

    if output.exists():
        print(f"YOLO weights already exist: {output}")
        return

    try:
        download_weight(repo_id, filename, output, os.getenv("HF_TOKEN"))
    except Exception as exc:
        print(f"Could not download YOLO weights. Lesion detection will run in demo mode. Error: {exc}")


if __name__ == "__main__":
    os.chdir(PROJECT_ROOT)
    os.environ.setdefault("FUNDUSX_RUNTIME_DIR", "/tmp/fundusx")
    os.environ.setdefault("FUNDUSX_UPLOAD_DIR", "/tmp/fundusx/uploads")
    os.environ.setdefault("FUNDUSX_FIGURE_DIR", "/tmp/fundusx/figures")
    ensure_classifier_weights()
    ensure_yolo_weights()

    import uvicorn

    port = int(os.getenv("PORT", "7860"))
    uvicorn.run("api_server.app:app", host="0.0.0.0", port=port)
