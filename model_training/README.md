# FundusX-AI Classifier Training

This folder trains the diabetic retinopathy classifier used by the AI detection page.

The target output is:

```text
weights/classifier_efficientnet_b3.pth
```

## Recommended Public Dataset

Start with APTOS 2019 Blindness Detection from Kaggle. It uses five labels:

```text
0: No DR
1: Mild
2: Moderate
3: Severe
4: Proliferative DR
```

You can later add EyePACS, DDR, Messidor, or IDRiD after checking each license and data-use terms.

## Expected Raw APTOS Layout

```text
data/raw/aptos2019/
├── train.csv
└── train_images/
    ├── 000c1434d8d7.png
    └── ...
```

The CSV should contain:

```text
id_code,diagnosis
```

If your downloaded archive is already split like this:

```text
archive/
├── train_images/
├── val_images/
├── test_images/
├── train_1.csv
├── valid.csv
└── test.csv
```

Use:

```bash
python model_training/prepare_existing_split_imagefolder.py ^
  --archive-dir "E:\眼科诊断彩色图谱\archive" ^
  --output-dir data/fundus_dr
```

## Step 1: Prepare ImageFolder Dataset

```bash
python model_training/prepare_aptos_imagefolder.py ^
  --csv data/raw/aptos2019/train.csv ^
  --image-dir data/raw/aptos2019/train_images ^
  --output-dir data/fundus_dr ^
  --val-ratio 0.15 ^
  --test-ratio 0.10
```

This creates:

```text
data/fundus_dr/
├── train/
├── val/
└── test/
```

## Step 2: Train EfficientNet-B3

```bash
python model_training/train_efficientnet_b3.py ^
  --data-dir data/fundus_dr ^
  --epochs 20 ^
  --batch-size 8 ^
  --output weights/classifier_efficientnet_b3.pth
```

Use a GPU if possible. CPU training will be slow.

## Step 3: Upload Model to Hugging Face

Set a Hugging Face token with write permission:

```bash
set HF_TOKEN=hf_xxxxxxxxxxxxxxxxx
```

Then upload:

```bash
python model_training/upload_classifier_to_hf.py ^
  --repo-id your-hf-username/fundusx-efficientnet-b3-dr ^
  --weights weights/classifier_efficientnet_b3.pth
```

Hugging Face upload is done with the official `huggingface_hub` API.

## Step 4: Use in API Backend

Download the model on your backend server and set:

```text
FUNDUSX_CLASSIFIER_WEIGHTS=weights/classifier_efficientnet_b3.pth
```

The FastAPI `/analyze` endpoint will stop returning demo results once the file exists.

## Optional: Import Training Images into Doctor Quiz

The training dataset can also become the website doctor quiz image bank. This uploads compressed JPG copies to Cloudflare R2 and writes quiz records into Supabase.

First run a dry run:

```bash
python model_training/import_imagefolder_to_r2_supabase.py ^
  --data-dir data/fundus_dr ^
  --dry-run
```

Then configure environment variables:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_BASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Import all images:

```bash
python model_training/import_imagefolder_to_r2_supabase.py ^
  --data-dir data/fundus_dr ^
  --max-size 900 ^
  --quality 82
```

After import, `/quiz` will randomly sample 10 active `quiz` images from Supabase.

## Important Medical Note

This model is for research and AI-assisted screening only. It is not a certified diagnostic device. Before any clinical use, validate on an external dataset and with ophthalmologist review.
