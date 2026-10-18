-- Zomi backend: aggregate Gemini usage tracking (no per-user data).
-- Applied via runMigration. Safe to re-run.

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
-- No policies on purpose: only reachable through the SECURITY DEFINER RPCs
-- below, which verify the server-only backend secret (zomi_verify).
revoke all on public.gemini_usage_daily from anon, authenticated;

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
  perform zomi_verify(p_secret);

  insert into public.gemini_usage_daily
    (day, requests, errors, prompt_tokens, output_tokens, by_model, updated_at)
  values
    (p_day, greatest(p_requests, 0), greatest(p_errors, 0),
     greatest(p_prompt_tokens, 0), greatest(p_output_tokens, 0),
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

create or replace function public.admin_gemini_usage(
  p_secret text,
  p_admin_user_id text,
  p_days int default 30
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
        limit greatest(least(p_days, 365), 1)
      ) d
    ), '[]'::jsonb)
  );
end;
$$;
