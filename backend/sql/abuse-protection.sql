-- Optional: persists the admin block list across server restarts.
-- Without this table the block list still works, but only in memory.
create table if not exists public.blocked_clients (
  value text primary key,
  kind text not null default 'device' check (kind in ('device', 'network')),
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.blocked_clients enable row level security;
-- No policies: only the service role (server) can read or write this table.
