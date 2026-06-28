create table if not exists access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text not null,
  expires_at timestamp with time zone not null,
  max_uses integer,
  use_count integer not null default 0,
  is_active boolean not null default true,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists idx_access_codes_active_expires on access_codes(is_active, expires_at desc);

alter table access_codes enable row level security;
