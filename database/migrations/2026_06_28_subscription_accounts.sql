create table if not exists subscription_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  code_hash text not null,
  label text not null,
  expires_at timestamp with time zone not null,
  max_uses integer,
  use_count integer not null default 0,
  is_active boolean not null default true,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists idx_subscription_accounts_active_expires on subscription_accounts(is_active, expires_at desc);
create index if not exists idx_subscription_accounts_username on subscription_accounts(username);

alter table subscription_accounts enable row level security;
