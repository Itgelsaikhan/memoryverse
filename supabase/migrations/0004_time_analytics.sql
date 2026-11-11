-- MemoryVerse — Week 3: Time Analytics (multi-year indicators by country)
-- Run once in Supabase: SQL Editor → New query → paste → Run

-- ───────────── Indicators ─────────────
create table if not exists public.indicators (
  code text primary key check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null,
  unit text,
  description text,
  source text,
  source_url text,
  min_year smallint,
  max_year smallint,
  updated_at timestamptz not null default now()
);

create table if not exists public.indicator_values (
  indicator text not null references public.indicators(code) on delete cascade,
  country char(3) not null check (country ~ '^[A-Z]{3}$'),
  year smallint not null check (year between 1900 and 2100),
  value double precision not null,
  primary key (indicator, country, year)
);

create index if not exists indicator_values_year_idx on public.indicator_values (indicator, year);

alter table public.indicators enable row level security;
alter table public.indicator_values enable row level security;

create policy "indicators: anyone can read" on public.indicators
  for select to anon, authenticated using (true);
create policy "indicator values: anyone can read" on public.indicator_values
  for select to anon, authenticated using (true);
-- Writes only through admin_import_indicator()

-- p_rows: [[country, year, value], ...]
create or replace function public.admin_import_indicator(p_code text, p_meta jsonb, p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  inserted int;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_ONLY';
  end if;

  insert into public.indicators (code, name, unit, description, source, source_url)
  values (p_code, p_meta->>'name', p_meta->>'unit', p_meta->>'description', p_meta->>'source', p_meta->>'source_url')
  on conflict (code) do update
    set name = excluded.name, unit = excluded.unit, description = excluded.description,
        source = excluded.source, source_url = excluded.source_url, updated_at = now();

  delete from public.indicator_values where indicator = p_code;

  insert into public.indicator_values (indicator, country, year, value)
  select p_code, r->>0, (r->>1)::smallint, (r->>2)::double precision
  from jsonb_array_elements(p_rows) as r
  where (r->>0) ~ '^[A-Z]{3}$' and (r->>2) is not null
  on conflict do nothing;
  get diagnostics inserted = row_count;

  update public.indicators i
     set min_year = s.mn, max_year = s.mx
    from (select min(year) mn, max(year) mx from public.indicator_values where indicator = p_code) s
   where i.code = p_code;

  return inserted;
end $$;
revoke all on function public.admin_import_indicator(text, jsonb, jsonb) from public, anon;
grant execute on function public.admin_import_indicator(text, jsonb, jsonb) to authenticated;

-- World trend: unweighted average across countries that have data that year
create or replace function public.indicator_world_trend(p_code text)
returns table (year smallint, avg_value double precision, countries int)
language sql stable set search_path = public as $$
  select year, avg(value), count(*)::int
  from public.indicator_values
  where indicator = p_code
  group by year
  having count(*) >= 10
  order by year;
$$;
grant execute on function public.indicator_world_trend(text) to anon, authenticated;

-- First vs latest value per country (for "biggest changes")
create or replace function public.indicator_changes(p_code text, p_min_span int default 8)
returns table (country char(3), first_year smallint, first_value double precision,
               last_year smallint, last_value double precision, change double precision)
language sql stable set search_path = public as $$
  with ranked as (
    select country, year, value,
           row_number() over (partition by country order by year asc) as rf,
           row_number() over (partition by country order by year desc) as rl
    from public.indicator_values
    where indicator = p_code
  ), f as (select country, year, value from ranked where rf = 1),
     l as (select country, year, value from ranked where rl = 1)
  select f.country, f.year, f.value, l.year, l.value, l.value - f.value
  from f join l using (country)
  where l.year - f.year >= greatest(p_min_span, 1)
  order by abs(l.value - f.value) desc;
$$;
grant execute on function public.indicator_changes(text, int) to anon, authenticated;

-- ───────────── What makes people happy at each age (from moments) ─────────────
drop materialized view if exists public.age_topic_stats;
create materialized view public.age_topic_stats as
select
  case
    when age < 25 then '18–24'
    when age < 35 then '25–34'
    when age < 45 then '35–44'
    when age < 55 then '45–54'
    else '55+'
  end as age_group,
  topic,
  count(*)::int as n
from public.moments
where age between 18 and 100 and topic is not null
group by 1, 2;

create unique index if not exists age_topic_stats_idx on public.age_topic_stats (age_group, topic);
grant select on public.age_topic_stats to anon, authenticated;

-- Include the new view in the shared refresh
create or replace function public._refresh_stats()
returns void language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view concurrently public.country_stats;
  refresh materialized view concurrently public.emotion_topic_stats;
  refresh materialized view concurrently public.age_topic_stats;
end $$;
revoke all on function public._refresh_stats() from public, anon, authenticated;

-- Countries that have data for an indicator (API responses are capped at 1000 rows, so aggregate in SQL)
create or replace function public.indicator_countries(p_code text)
returns table (country char(3))
language sql stable set search_path = public as $$
  select distinct v.country from public.indicator_values v where v.indicator = p_code;
$$;
grant execute on function public.indicator_countries(text) to anon, authenticated;
