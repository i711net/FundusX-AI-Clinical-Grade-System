alter table ai_reports enable row level security;

alter table ai_reports add column if not exists pdf_url text;
alter table ai_reports add column if not exists pdf_storage_key text;
alter table ai_reports add column if not exists pdf_size_bytes bigint;

drop policy if exists "Public read ai reports" on ai_reports;
drop policy if exists "Prototype insert ai reports" on ai_reports;

create index if not exists idx_ai_reports_risk_created_at
  on ai_reports(risk_level, created_at desc);
