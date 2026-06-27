from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api_server.pipeline import full_pipeline


app = FastAPI(title="FundusX-AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
FIGURE_DIR = Path("figures")
UPLOAD_DIR.mkdir(exist_ok=True)
FIGURE_DIR.mkdir(exist_ok=True)

app.mount("/figures", StaticFiles(directory=str(FIGURE_DIR)), name="figures")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok", "service": "FundusX-AI"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    suffix = Path(file.filename or "image.jpg").suffix or ".jpg"
    image_path = UPLOAD_DIR / f"{uuid4().hex}{suffix}"
    image_path.write_bytes(await file.read())

    result = full_pipeline(str(image_path))
    result["image_path"] = str(image_path.as_posix())
    result["disclaimer"] = "Research prototype only. Not for standalone clinical diagnosis."
    return result
