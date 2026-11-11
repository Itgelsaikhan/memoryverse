-- MemoryVerse — Week 2: public moments dataset, Humanity Map statistics, admin role
-- Run once in Supabase: SQL Editor → New query → paste → Run

-- ───────────── Roles ─────────────
alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

-- Users may only change their display name — never their own role or plan
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to authenticated, anon;

-- ───────────── Country on capsules (for sharing on the map) ─────────────
alter table public.capsules
  add column if not exists country char(3) check (country ~ '^[A-Z]{3}$');

-- ───────────── Public moments (open datasets + anonymously shared capsules) ─────────────
create table if not exists public.moments (
  id bigint generated always as identity primary key,
  source text not null default 'user',
  capsule_id uuid unique references public.capsules(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  topic text,
  emotion text,
  country char(3),
  age smallint,
  gender text,
  period text,
  created_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('english', text)) stored
);

create index if not exists moments_country_idx on public.moments (country);
create index if not exists moments_emotion_idx on public.moments (emotion);
create index if not exists moments_source_idx on public.moments (source);
create index if not exists moments_search_idx on public.moments using gin (search);

alter table public.moments enable row level security;

create policy "moments: anyone can read" on public.moments
  for select to anon, authenticated using (true);
-- No insert/update/delete policies: writes only happen through the functions below.

-- Anonymously mirror public *memory* capsules into moments (sealed future capsules never appear)
create or replace function public.sync_public_capsule()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    return old; -- capsule_id foreign key cascades
  end if;

  if new.is_public and new.kind = 'memory' and new.country is not null then
    insert into public.moments (source, capsule_id, text, topic, emotion, country, created_at)
    values ('user', new.id, left(coalesce(nullif(new.body, ''), new.title), 400),
            new.topic, new.emotion, new.country, new.created_at)
    on conflict (capsule_id) do update
      set text = excluded.text, topic = excluded.topic,
          emotion = excluded.emotion, country = excluded.country;
  elsif exists (select 1 from public.moments where capsule_id = new.id) then
    delete from public.moments where capsule_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists capsules_sync_public on public.capsules;
create trigger capsules_sync_public
  after insert or update on public.capsules
  for each row execute function public.sync_public_capsule();

-- ───────────── Statistics (materialized views = fast map and analytics) ─────────────
drop materialized view if exists public.country_stats;
create materialized view public.country_stats as
select
  country,
  count(*)::int as total,
  count(*) filter (where emotion = 'joy')::int as joy,
  count(*) filter (where emotion = 'love')::int as love,
  count(*) filter (where emotion = 'pride')::int as pride,
  count(*) filter (where emotion = 'calm')::int as calm,
  count(*) filter (where emotion = 'nostalgia')::int as nostalgia,
  count(*) filter (where emotion = 'hope')::int as hope,
  count(*) filter (where emotion = 'sadness')::int as sadness,
  count(*) filter (where emotion = 'fear')::int as fear,
  mode() within group (order by emotion) as top_emotion,
  mode() within group (order by topic) as top_topic
from public.moments
where country is not null
group by country;

create unique index if not exists country_stats_country_idx on public.country_stats (country);

drop materialized view if exists public.emotion_topic_stats;
create materialized view public.emotion_topic_stats as
select coalesce(emotion, 'unknown') as emotion, coalesce(topic, 'other') as topic, count(*)::int as n
from public.moments
group by 1, 2;

create unique index if not exists emotion_topic_stats_idx on public.emotion_topic_stats (emotion, topic);

grant select on public.country_stats, public.emotion_topic_stats to anon, authenticated;

-- Internal (not callable through the API)
create or replace function public._refresh_stats()
returns void language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view concurrently public.country_stats;
  refresh materialized view concurrently public.emotion_topic_stats;
end $$;
revoke all on function public._refresh_stats() from public, anon, authenticated;

-- Admin-only manual refresh (used after a dataset import)
create or replace function public.refresh_stats()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'ADMIN_ONLY';
  end if;
  perform public._refresh_stats();
end $$;
revoke all on function public.refresh_stats() from public, anon;
grant execute on function public.refresh_stats() to authenticated;

-- Refresh stats when someone shares or unshares a capsule (cheap: a few hundred ms at 100k rows)
create or replace function public.refresh_stats_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._refresh_stats();
  return null;
end $$;

drop trigger if exists moments_user_refresh on public.moments;
create trigger moments_user_refresh
  after insert or update or delete on public.moments
  for each statement execute function public.refresh_stats_trigger();

-- ───────────── Read functions for the map ─────────────
create or replace function public.sample_moments(p_country char(3), p_emotion text default null, p_limit int default 6)
returns table (text text, topic text, emotion text, age smallint, source text)
language sql volatile set search_path = public as $$
  select m.text, m.topic, m.emotion, m.age, m.source
  from public.moments m
  where m.country = p_country
    and (p_emotion is null or m.emotion = p_emotion)
    and char_length(m.text) between 30 and 220
  order by random()
  limit least(greatest(p_limit, 1), 20);
$$;
grant execute on function public.sample_moments(char, text, int) to anon, authenticated;

create or replace function public.search_moments(p_query text, p_limit int default 20)
returns table (text text, topic text, emotion text, country char(3), rank real)
language sql stable set search_path = public as $$
  select m.text, m.topic, m.emotion, m.country, ts_rank(m.search, q) as rank
  from public.moments m, websearch_to_tsquery('english', p_query) q
  where m.search @@ q
  order by rank desc
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.search_moments(text, int) to anon, authenticated;

-- ───────────── Admin: dataset import ─────────────
-- rows: [[text, topic, emotion, country, age, gender, period], ...]
create or replace function public.admin_import_moments(p_source text, p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  inserted int;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_ONLY';
  end if;

  alter table public.moments disable trigger moments_user_refresh;

  insert into public.moments (source, text, topic, emotion, country, age, gender, period)
  select p_source, r->>0, r->>1, r->>2, nullif(r->>3, ''), (r->>4)::smallint, r->>5, r->>6
  from jsonb_array_elements(p_rows) as r
  where char_length(r->>0) between 1 and 2000;
  get diagnostics inserted = row_count;

  alter table public.moments enable trigger moments_user_refresh;
  return inserted;
end $$;
revoke all on function public.admin_import_moments(text, jsonb) from public, anon;
grant execute on function public.admin_import_moments(text, jsonb) to authenticated;

create or replace function public.admin_delete_source(p_source text)
returns int language plpgsql security definer set search_path = public as $$
declare
  deleted int;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_ONLY';
  end if;
  if p_source = 'user' then
    raise exception 'USER_DATA_PROTECTED';
  end if;
  alter table public.moments disable trigger moments_user_refresh;
  delete from public.moments where source = p_source;
  get diagnostics deleted = row_count;
  alter table public.moments enable trigger moments_user_refresh;
  return deleted;
end $$;
revoke all on function public.admin_delete_source(text) from public, anon;
grant execute on function public.admin_delete_source(text) to authenticated;

create or replace function public.admin_source_counts()
returns table (source text, n bigint)
language sql stable security definer set search_path = public as $$
  select source, count(*) from public.moments where public.is_admin() group by source order by 2 desc;
$$;
grant execute on function public.admin_source_counts() to authenticated;
