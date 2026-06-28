import os
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api_server.pipeline import full_pipeline
from api_server.supabase_client import save_ai_report


app = FastAPI(title="FundusX-AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def writable_dir(env_name: str, default_path: str) -> Path:
    configured = os.getenv(env_name, default_path).strip()
    path = Path(configured)
    if configured in {"", "."}:
        path = Path(default_path)
    try:
        path.mkdir(parents=True, exist_ok=True)
        probe = path / ".write_test"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return path
    except OSError:
        fallback = Path(default_path)
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback


RUNTIME_DIR = Path(os.getenv("FUNDUSX_RUNTIME_DIR", "/tmp/fundusx"))
if str(RUNTIME_DIR).strip() in {"", "."}:
    RUNTIME_DIR = Path("/tmp/fundusx")

UPLOAD_DIR = writable_dir("FUNDUSX_UPLOAD_DIR", str(RUNTIME_DIR / "uploads"))
FIGURE_DIR = writable_dir("FUNDUSX_FIGURE_DIR", str(RUNTIME_DIR / "figures"))

app.mount("/figures", StaticFiles(directory=str(FIGURE_DIR)), name="figures")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok", "service": "FundusX-AI"}


@app.get("/model-status")
def model_status():
    classifier_weights = Path(os.getenv("FUNDUSX_CLASSIFIER_WEIGHTS", "weights/classifier_efficientnet_b3.pth"))
    yolo_weights = Path(os.getenv("FUNDUSX_YOLO_WEIGHTS", "weights/yolo_lesion_detector.pt"))
    return {
        "classifier": {
            "path": str(classifier_weights.as_posix()),
            "exists": classifier_weights.exists(),
            "size_bytes": classifier_weights.stat().st_size if classifier_weights.exists() else 0,
            "hf_model_repo_id_set": bool(os.getenv("HF_MODEL_REPO_ID")),
            "hf_model_filename": os.getenv("HF_MODEL_FILENAME", "classifier_efficientnet_b3.pth"),
        },
        "lesion_detector": {
            "path": str(yolo_weights.as_posix()),
            "exists": yolo_weights.exists(),
            "hf_yolo_filename": os.getenv("HF_YOLO_FILENAME", ""),
            "note": "YOLO detector is optional. Missing YOLO weights only affects lesion boxes, not DR classification.",
        },
        "runtime": {
            "upload_dir": str(UPLOAD_DIR.as_posix()),
            "figure_dir": str(FIGURE_DIR.as_posix()),
        },
    }


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "FundusX-AI",
        "endpoints": {
            "health": "/health",
            "model_status": "/model-status",
            "docs": "/docs",
            "analyze": "/analyze",
        },
        "note": "Research prototype only. Not for standalone clinical diagnosis.",
    }


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        suffix = Path(file.filename or "image.jpg").suffix or ".jpg"
        image_path = UPLOAD_DIR / f"{uuid4().hex}{suffix}"
        image_path.write_bytes(await file.read())

        result = full_pipeline(str(image_path))
        result["image_path"] = str(image_path.as_posix())
        report_id = save_ai_report(result)
        if report_id:
            result["report_id"] = report_id
        result["disclaimer"] = "Research prototype only. Not for standalone clinical diagnosis."
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analyze failed: {exc}") from exc
