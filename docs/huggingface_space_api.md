# Deploy Python AI Backend to Hugging Face Spaces

Use this when the classifier model is already uploaded to a Hugging Face Model repository.

## 1. Create a New Space

On Hugging Face:

```text
New Space
SDK: Docker
Visibility: Public or Private
```

Hugging Face Docker Spaces expose port `7860` by default. This project includes `Dockerfile.huggingface`, which starts the FastAPI API on that port.

## 2. Files to Upload to the Space

Upload the project files to the Space repository, but rename/copy:

```text
Dockerfile.huggingface -> Dockerfile
huggingface_space/README.md -> README.md
```

The Space needs these project folders:

```text
api_server/
classification_model/
explainability/
yolo_lesion_detection/
model_training/
requirements.txt
Dockerfile
README.md
```

Do not upload:

```text
frontend/
data/
weights/
node_modules/
.next/
.venv312/
```

## 3. Space Variables and Secrets

In Space Settings, add Variables:

```text
HF_MODEL_REPO_ID=your-hf-username/fundusx-efficientnet-b3-dr
HF_MODEL_FILENAME=classifier_efficientnet_b3.pth
FUNDUSX_CLASSIFIER_WEIGHTS=/tmp/fundusx/weights/classifier_efficientnet_b3.pth
FUNDUSX_YOLO_WEIGHTS=/tmp/fundusx/weights/yolo_lesion_detector.pt
FUNDUSX_RUNTIME_DIR=/tmp/fundusx
FUNDUSX_UPLOAD_DIR=/tmp/fundusx/uploads
FUNDUSX_FIGURE_DIR=/tmp/fundusx/figures
```

Optional, after uploading YOLO weights to the model repo:

```text
HF_YOLO_FILENAME=yolo_lesion_detector.pt
```

If YOLO is stored in a different model repo:

```text
HF_YOLO_REPO_ID=your-hf-username/your-yolo-model-repo
```

Do not set `FUNDUSX_CLASSIFIER_WEIGHTS` to `.`. It must be a file path, not a folder. On Hugging Face Spaces, use `/tmp/fundusx/weights/classifier_efficientnet_b3.pth` because the app directory may be read-only at runtime.

If the model repository is private, add Secret:

```text
HF_TOKEN=your-huggingface-read-token
```

Optional, if you want reports saved to Supabase:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in the Vercel frontend.

## 4. API URL

After the Space builds, test:

```text
https://your-username-your-space-name.hf.space/health
```

It should return:

```json
{"status":"ok","service":"FundusX-AI"}
```

Use this URL in Vercel:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-username-your-space-name.hf.space
```

Then redeploy Vercel.

## 5. How It Works

On startup, `api_server/start_hf_space.py` checks whether:

```text
weights/classifier_efficientnet_b3.pth
```

exists. If not, it downloads:

```text
HF_MODEL_REPO_ID / HF_MODEL_FILENAME
```

from Hugging Face Hub, then starts FastAPI.
