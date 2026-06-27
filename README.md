# FundusX-AI Clinical Grade System

FundusX-AI is an end-to-end research and demo system for fundus image analysis. It combines diabetic retinopathy classification, lesion detection, explainability, structured reporting, API serving, a web interface, experiment scripts, and a LaTeX paper template.

> Medical safety note: this repository is for research, education, and prototype demonstration only. It is not a certified medical device and must not be used as the sole basis for diagnosis or treatment.

## What This Project Includes

- Ophthalmologist quiz workflow for reviewing 100 fundus images
- AI detection pipeline for fundus image classification
- YOLO-style lesion detection interface
- Grad-CAM explainability module
- FastAPI inference service
- Next.js web interface for upload, AI results, quiz, and report views
- Supabase schema for storing AI reports
- Admin dashboard for images, quizzes, reports, Supabase, and Cloudflare R2
- Experiment scripts for metrics, ROC curves, confusion matrix, and ablation charts
- SCI paper draft in LaTeX

## Repository Structure

```text
FundusX-AI-Clinical-Grade-System/
├── README.md
├── requirements.txt
├── environment.yml
├── LICENSE
├── Dockerfile
├── docker-compose.yml
├── datasets/
├── classification_model/
├── yolo_lesion_detection/
├── explainability/
├── api_server/
├── frontend/nextjs-app/
├── database/
├── experiments/
├── figures/
└── paper/
```

## Quick Start: API

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn api_server.app:app --reload --host 0.0.0.0 --port 8000
```

Open:

- API health check: http://localhost:8000/health
- API docs: http://localhost:8000/docs

## Quick Start: Frontend

```bash
cd frontend/nextjs-app
npm install
npm run dev
```

Open http://localhost:3000.

The frontend calls `NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:8000`.

Admin dashboard:

```text
http://localhost:3000/admin
```

For Supabase and Cloudflare R2 setup, see `docs/admin_setup.md`.

## Model Weights

This project is structured so you can run the software before trained weights are available. If model weights are missing, the API returns deterministic demo output and marks it as `demo_mode: true`.

Recommended paths:

```text
weights/classifier_efficientnet_b3.pth
weights/yolo_lesion_detector.pt
```

## Dataset Sources

Use public datasets only according to their licenses and ethics approvals:

- EyePACS
- APTOS 2019 Blindness Detection
- DDR
- IDRiD
- Messidor / Messidor-2

See `datasets/download_instructions.md`.

## Training

Classification:

```bash
python classification_model/train.py --data-dir data/fundus --epochs 20 --num-classes 5
```

YOLO lesion detection:

```bash
python yolo_lesion_detection/train_yolo.py --data yolo_lesion_detection/data.yaml --epochs 100 --imgsz 640
```

## Inference

```bash
python classification_model/inference.py --image sample_images/example.jpg --weights weights/classifier_efficientnet_b3.pth
```

API upload:

```bash
curl -X POST "http://localhost:8000/analyze" -F "file=@sample_images/example.jpg"
```

## Experiments

```bash
python experiments/metrics.py --predictions experiments/sample_predictions.csv
python experiments/roc_curve.py --predictions experiments/sample_predictions.csv
python experiments/confusion_matrix.py --predictions experiments/sample_predictions.csv
python experiments/ablation_study.py
```

Generated figures are saved to `figures/`.

## Paper

The LaTeX manuscript is in `paper/paper.tex`.

Suggested title:

**FundusX-AI: A Clinically Interpretable Multi-Task Deep Learning System for Diabetic Retinopathy Detection**

## GitHub Upload Steps

1. Create a new GitHub repository named `FundusX-AI-Clinical-Grade-System`.
2. Upload this folder or push it using Git.
3. Add trained model weights later through Git LFS or external release assets.
4. Update README results after real validation.

## Admin Deployment Environment

Set these in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_BASE_URL
```

Set these in the Python API host if AI reports should be written to Supabase:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## License

MIT License. See `LICENSE`.
