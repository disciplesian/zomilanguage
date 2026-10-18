-- Persists the admin block list across server restarts.
-- Applied via runMigration. Safe to re-run.
create table if not exists public.blocked_clients (
  value text primary key,
  kind text not null default 'device' check (kind in ('device', 'network')),
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.blocked_clients enable row level security;
-- No policies: only reachable through the SECURITY DEFINER RPCs below.
revoke all on public.blocked_clients from anon, authenticated;

-- Server read (used by the abuse guard on every instance start).
create or replace function public.list_blocked_clients(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform zomi_verify(p_secret);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'value', b.value, 'kind', b.kind, 'note', b.note, 'created_at', b.created_at
    ) order by b.created_at desc)
    from public.blocked_clients b
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_block_client(
  p_secret text,
  p_admin_user_id text,
  p_value text,
  p_kind text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform zomi_verify(p_secret);
  if not zomi_is_admin(p_admin_user_id) then
    raise exception 'forbidden';
  end if;
  if p_value is null or length(trim(p_value)) = 0 then
    raise exception 'missing value';
  end if;

  insert into public.blocked_clients (value, kind, note, created_at)
  values (
    left(trim(p_value), 128),
    case when p_kind = 'network' then 'network' else 'device' end,
    left(coalesce(p_note, ''), 200),
    now()
  )
  on conflict (value) do update
    set kind = excluded.kind, note = excluded.note;

  insert into public.admin_audit_log (action, user_id, details)
  values ('block_client', p_admin_user_id,
          jsonb_build_object('kind', case when p_kind = 'network' then 'network' else 'device' end));
end;
$$;

create or replace function public.admin_unblock_client(
  p_secret text,
  p_admin_user_id text,
  p_value text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform zomi_verify(p_secret);
  if not zomi_is_admin(p_admin_user_id) then
    raise exception 'forbidden';
  end if;
  delete from public.blocked_clients where value = trim(p_value);
  insert into public.admin_audit_log (action, user_id, details)
  values ('unblock_client', p_admin_user_id, '{}'::jsonb);
end;
$$;
