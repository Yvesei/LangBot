begin;

create table if not exists public.rate_limits (
  identity_key text primary key,
  hits integer not null default 0,
  window_expires timestamptz not null
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;
grant select, insert, update on public.rate_limits to service_role;

create or replace function public.register_rate_limit_hit(
  p_identity_key text,
  p_window_seconds integer,
  p_max_hits integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  window_now timestamptz := statement_timestamp();
  bucket public.rate_limits%rowtype;
begin
  if p_identity_key is null or length(trim(p_identity_key)) = 0
    or p_window_seconds is null or p_window_seconds <= 0
    or p_max_hits is null or p_max_hits <= 0 then
    raise exception 'Invalid rate limit parameters' using errcode = '22023';
  end if;

  -- The upsert locks this identity's row, including across concurrent requests.
  insert into public.rate_limits as limits (identity_key, hits, window_expires)
  values (p_identity_key, 1, window_now + make_interval(secs => p_window_seconds))
  on conflict (identity_key) do update
  set hits = case when limits.window_expires <= window_now then 1 else limits.hits + 1 end,
      window_expires = case when limits.window_expires <= window_now
        then excluded.window_expires else limits.window_expires end
  returning * into bucket;

  return query select
    bucket.hits <= p_max_hits,
    case when bucket.hits <= p_max_hits then 0
      else greatest(1, ceil(extract(epoch from bucket.window_expires - window_now))::integer)
    end;
end;
$$;

revoke execute on function public.register_rate_limit_hit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.register_rate_limit_hit(text, integer, integer)
  to service_role;

notify pgrst, 'reload schema';

commit;
