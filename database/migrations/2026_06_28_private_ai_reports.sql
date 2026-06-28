alter table ai_reports enable row level security;

drop policy if exists "Public read ai reports" on ai_reports;
drop policy if exists "Prototype insert ai reports" on ai_reports;

create index if not exists idx_ai_reports_risk_created_at
  on ai_reports(risk_level, created_at desc);
