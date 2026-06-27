create extension if not exists "pgcrypto";

create table if not exists ai_reports (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  diagnosis text not null,
  confidence double precision,
  lesions jsonb,
  heatmap_url text,
  detection_url text,
  risk_level text,
  recommendation text,
  created_at timestamp with time zone default now()
);

create table if not exists doctor_quiz_responses (
  id uuid primary key default gen_random_uuid(),
  doctor_id text,
  image_id text not null,
  selected_grade integer,
  ai_grade integer,
  is_correct boolean,
  response_time_ms integer,
  created_at timestamp with time zone default now()
);
