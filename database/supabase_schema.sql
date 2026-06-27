create extension if not exists "pgcrypto";

create table if not exists fundus_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  storage_key text,
  image_code text unique,
  image_type text not null default 'quiz' check (image_type in ('quiz', 'upload', 'validation', 'paper')),
  title text,
  diagnosis_label text,
  disease_grade integer check (disease_grade between 0 and 4),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

alter table fundus_images
  add column if not exists image_code text;

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamp with time zone default now()
);

create table if not exists quiz_items (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  image_id uuid not null references fundus_images(id) on delete cascade,
  item_order integer not null,
  reference_grade integer check (reference_grade between 0 and 4),
  created_at timestamp with time zone default now(),
  unique (quiz_id, item_order),
  unique (quiz_id, image_id)
);

create table if not exists ai_reports (
  id uuid primary key default gen_random_uuid(),
  fundus_image_id uuid references fundus_images(id) on delete set null,
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
  quiz_id uuid references quizzes(id) on delete set null,
  quiz_item_id uuid references quiz_items(id) on delete set null,
  image_id uuid references fundus_images(id) on delete set null,
  selected_grade integer,
  ai_grade integer,
  reference_grade integer,
  is_correct boolean,
  response_time_ms integer,
  created_at timestamp with time zone default now()
);

create index if not exists idx_fundus_images_type_active on fundus_images(image_type, is_active);
create index if not exists idx_fundus_images_code on fundus_images(image_code);
create index if not exists idx_quiz_items_quiz_order on quiz_items(quiz_id, item_order);
create index if not exists idx_ai_reports_created_at on ai_reports(created_at desc);
create index if not exists idx_doctor_quiz_responses_doctor on doctor_quiz_responses(doctor_id, created_at desc);

alter table fundus_images enable row level security;
alter table quizzes enable row level security;
alter table quiz_items enable row level security;
alter table ai_reports enable row level security;
alter table doctor_quiz_responses enable row level security;

create policy "Public read active fundus images" on fundus_images
  for select using (is_active = true);

create policy "Public read active quizzes" on quizzes
  for select using (is_active = true);

create policy "Public read quiz items" on quiz_items
  for select using (true);

create policy "Public read ai reports" on ai_reports
  for select using (true);

create policy "Public insert quiz responses" on doctor_quiz_responses
  for insert with check (true);

-- Admin prototype policies. For production, replace these with authenticated admin-role policies.
create policy "Prototype insert fundus images" on fundus_images
  for insert with check (true);

create policy "Prototype update fundus images" on fundus_images
  for update using (true) with check (true);

create policy "Prototype delete fundus images" on fundus_images
  for delete using (true);

create policy "Prototype insert quizzes" on quizzes
  for insert with check (true);

create policy "Prototype insert quiz items" on quiz_items
  for insert with check (true);

create policy "Prototype insert ai reports" on ai_reports
  for insert with check (true);
