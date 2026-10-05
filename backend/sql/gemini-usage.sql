-- Zomi backend: aggregate Gemini usage tracking (no per-user data).
-- Apply in Supabase SQL Editor. Safe to re-run.
--
-- Until this is applied, the /api/admin/usage endpoint still returns live
-- in-memory data for "today"; historical days stay empty and
-- persistAvailable stays false.

create table if not exists public.gemini_usage_daily (
  day date primary key,
  requests bigint not null default 0 check (requests >= 0),
  errors bigint not null default 0 check (errors >= 0),
  prompt_tokens bigint not null default 0 check (prompt_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  by_model jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.gemini_usage_daily enable row level security;
-- No policies on purpose: the table is only reachable through the
-- SECURITY DEFINER RPCs below, which verify the server-only secret.
revoke all on public.gemini_usage_daily from anon, authenticated;

-- Upsert today's aggregate (called by the backend with ZOMI_BACKEND_DB_SECRET).
create or replace function public.record_gemini_usage(
  p_secret text,
  p_day date,
  p_requests bigint,
  p_errors bigint,
  p_prompt_tokens bigint,
  p_output_tokens bigint,
  p_by_model jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is distinct from current_setting('app.settings.backend_secret', true) then
    raise exception 'Invalid backend secret';
  end if;

  insert into public.gemini_usage_daily
    (day, requests, errors, prompt_tokens, output_tokens, by_model, updated_at)
  values
    (p_day, p_requests, p_errors, p_prompt_tokens, p_output_tokens,
     coalesce(p_by_model, '{}'::jsonb), now())
  on conflict (day) do update
    set requests = excluded.requests,
        errors = excluded.errors,
        prompt_tokens = excluded.prompt_tokens,
        output_tokens = excluded.output_tokens,
        by_model = excluded.by_model,
        updated_at = now();
end;
$$;

-- Admin read: last N days of aggregate usage.
create or replace function public.admin_gemini_usage(
  p_secret text,
  p_admin_user_id uuid,
  p_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if p_secret is distinct from current_setting('app.settings.backend_secret', true) then
    raise exception 'Invalid backend secret';
  end if;

  select role into v_role from public.portal_users where user_id = p_admin_user_id;
  if v_role is distinct from 'admin' then
    raise exception 'forbidden';
  end if;

  return jsonb_build_object(
    'days',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'requests', d.requests,
        'errors', d.errors,
        'promptTokens', d.prompt_tokens,
        'outputTokens', d.output_tokens
      ) order by d.day desc)
      from (
        select *
        from public.gemini_usage_daily
        order by day desc
        limit greatest(p_days, 1)
      ) d
    ), '[]'::jsonb)
  );
end;
$$;
