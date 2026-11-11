-- MemoryVerse — initial schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run

-- ───────────── Profiles & plans ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'premium', 'legacy')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: update own name" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Create a profile automatically for every new user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Capsules ─────────────
do $$ begin
  create type public.capsule_kind as enum ('memory', 'future');
exception when duplicate_object then null; end $$;

create table if not exists public.capsules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind public.capsule_kind not null default 'memory',
  title text not null check (char_length(title) between 1 and 120),
  body text check (char_length(body) <= 10000),
  emotion text check (emotion in ('joy','love','nostalgia','hope','sadness','pride','fear','calm')),
  topic text check (char_length(topic) <= 40),
  memory_date date,
  location_name text check (char_length(location_name) <= 120),
  media_path text,
  is_public boolean not null default false,
  unlock_at timestamptz,
  epilogue text check (char_length(epilogue) <= 5000),
  created_at timestamptz not null default now(),
  constraint future_needs_unlock check (kind = 'memory' or unlock_at is not null)
);

create index if not exists capsules_user_created_idx on public.capsules (user_id, created_at desc);
create index if not exists capsules_public_idx on public.capsules (is_public) where is_public;

alter table public.capsules enable row level security;

-- Owners can read a capsule directly only when it is NOT sealed.
-- Sealed future capsules are listed through list_my_capsules() with their content hidden.
create policy "capsules: read own unsealed" on public.capsules
  for select using (user_id = auth.uid() and (kind = 'memory' or unlock_at <= now()));

create policy "capsules: insert own" on public.capsules
  for insert with check (
    user_id = auth.uid()
    and (kind = 'memory' or unlock_at > now())
  );

-- Sealed capsules cannot be edited (only after they open, e.g. to add an epilogue)
create policy "capsules: update own unsealed" on public.capsules
  for update using (user_id = auth.uid() and (kind = 'memory' or unlock_at <= now()))
  with check (user_id = auth.uid());

create policy "capsules: delete own" on public.capsules
  for delete using (user_id = auth.uid());

-- Free plan limit: 50 capsules
create or replace function public.enforce_capsule_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_plan text;
  total int;
begin
  select plan into user_plan from public.profiles where id = new.user_id;
  if coalesce(user_plan, 'free') = 'free' then
    select count(*) into total from public.capsules where user_id = new.user_id;
    if total >= 50 then
      raise exception 'FREE_LIMIT_REACHED' using hint = 'Upgrade to Premium for unlimited capsules';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists capsules_limit on public.capsules;
create trigger capsules_limit before insert on public.capsules
  for each row execute function public.enforce_capsule_limit();

-- List all of the current user's capsules; sealed ones come back without content
create or replace function public.list_my_capsules(p_kind public.capsule_kind default null)
returns table (
  id uuid, kind public.capsule_kind, title text, body text, emotion text, topic text,
  memory_date date, location_name text, media_path text, is_public boolean,
  unlock_at timestamptz, epilogue text, created_at timestamptz, is_sealed boolean
)
language sql stable security definer set search_path = public as $$
  select c.id, c.kind, c.title,
         case when sealed then null else c.body end,
         c.emotion, c.topic, c.memory_date, c.location_name,
         case when sealed then null else c.media_path end,
         c.is_public, c.unlock_at,
         case when sealed then null else c.epilogue end,
         c.created_at, sealed
  from public.capsules c
  cross join lateral (select (c.kind = 'future' and c.unlock_at > now()) as sealed) s
  where c.user_id = auth.uid()
    and (p_kind is null or c.kind = p_kind)
  order by coalesce(c.memory_date::timestamptz, c.created_at) desc;
$$;

revoke all on function public.list_my_capsules(public.capsule_kind) from public, anon;
grant execute on function public.list_my_capsules(public.capsule_kind) to authenticated;

-- ───────────── Storage (photos, audio, video) ─────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)
on conflict (id) do nothing;

create policy "media: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
