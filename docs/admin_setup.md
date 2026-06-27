# Admin, Supabase, and Cloudflare R2 Setup

This project uses:

- Vercel for the Next.js website
- Supabase for data tables and admin records
- Cloudflare R2 for fundus image files
- Python FastAPI for AI inference

## 1. Supabase Setup

Create a Supabase project, then open SQL Editor and run:

```text
database/supabase_schema.sql
```

This creates:

- `fundus_images`
- `quizzes`
- `quiz_items`
- `doctor_quiz_responses`
- `ai_reports`

For the prototype admin page, insert policies are open so the admin page can write data with the anon key. Before clinical or public production use, replace the prototype policies with authenticated admin-only policies.

## 2. Cloudflare R2 Setup

Create an R2 bucket, for example:

```text
fundusx-ai
```

Create an R2 API token with object read/write access to this bucket.

Expose files using either:

- a custom public domain, recommended
- an R2 public development URL, for testing only

The public base URL is used to build image URLs after upload.

## 3. Vercel Environment Variables

In Vercel project settings, add these variables:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-python-api.example.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=fundusx-ai
R2_PUBLIC_BASE_URL=https://your-r2-public-domain.example.com
```

Only variables starting with `NEXT_PUBLIC_` are visible in the browser. R2 secret variables stay server-side inside the Next.js API route.

## 4. Python API Environment Variables

If you want the Python AI backend to save reports into Supabase after `/analyze`, add:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Keep the service role key only on the backend server. Never expose it in frontend code.

## 5. Admin URL

After deployment, open:

```text
https://your-site.vercel.app/admin
```

Admin functions included:

- upload fundus photos to Cloudflare R2
- write image metadata into Supabase
- create quiz records
- browse AI reports from Supabase
- view connection status

## 6. Suggested Workflow

```text
Admin uploads fundus image
→ Next.js API uploads file to R2
→ Admin page writes image URL and labels to Supabase
→ Quiz pages read selected images from Supabase
→ Python API runs AI detection
→ AI report is saved to Supabase
→ Admin report page browses the results
```
