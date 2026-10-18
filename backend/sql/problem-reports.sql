-- Privacy-safe problem reports (crashes, errors, slow screens).
-- Stores only aggregated counts per day/platform/version/signature.
-- No user ids, device ids, network addresses, or translated text.
-- Applied via runMigration. Safe to re-run.
create table if not exists public.client_problems (
  day date not null,
  platform text not null,
  app_version text not null,
  kind text not null check (kind in ('crash', 'error', 'slow')),
  signature text not null,
  screen text not null default '',
  count integer not null default 0,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (day, platform, app_version, kind, signature)
);

alter table public.client_problems enable row level security;
revoke all on public.client_problems from anon, authenticated;

create or replace function public.record_client_problems(p_secret text, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  perform zomi_verify(p_secret);
  for item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) limit 200 loop
    insert into public.client_problems (day, platform, app_version, kind, signature, screen, count)
    values (
      current_date,
      left(coalesce(item->>'platform', 'unknown'), 16),
      left(coalesce(item->>'appVersion', ''), 24),
      case when item->>'kind' in ('crash', 'error', 'slow') then item->>'kind' else 'error' end,
      left(coalesce(item->>'signature', ''), 200),
      left(coalesce(item->>'screen', ''), 48),
      greatest(1, least(coalesce((item->>'count')::int, 1), 1000))
    )
    on conflict (day, platform, app_version, kind, signature) do update
      set count = public.client_problems.count + excluded.count,
          screen = excluded.screen,
          last_seen = now();
  end loop;
  -- Keep 90 days.
  delete from public.client_problems where day < current_date - 90;
end;
$$;

create or replace function public.admin_client_problems(
  p_secret text,
  p_admin_user_id text,
  p_days integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform zomi_verify(p_secret);
  if not zomi_is_admin(p_admin_user_id) then
    raise exception 'forbidden';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.total desc)
    from (
      select platform, app_version as "appVersion", kind, signature,
             max(screen) as screen, sum(count)::int as total,
             min(first_seen) as "firstSeen", max(last_seen) as "lastSeen"
      from public.client_problems
      where day >= current_date - greatest(1, least(coalesce(p_days, 7), 90))
      group by platform, app_version, kind, signature
      order by total desc
      limit 100
    ) t
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.record_client_problems(text, jsonb) from public;
revoke all on function public.admin_client_problems(text, text, integer) from public;
grant execute on function public.record_client_problems(text, jsonb) to anon, authenticated;
grant execute on function public.admin_client_problems(text, text, integer) to anon, authenticated;
