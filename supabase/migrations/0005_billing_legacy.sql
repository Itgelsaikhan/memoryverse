-- MemoryVerse — Week 4: plans & demo billing, plan limits, Legacy delivery
-- Run once in Supabase: SQL Editor → New query → paste → Run

-- ───────────── Subscription fields ─────────────
alter table public.profiles
  add column if not exists plan_renews_at timestamptz,
  add column if not exists plan_cancel_at_period_end boolean not null default false,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists legacy_inactivity_days int not null default 365
    check (legacy_inactivity_days between 30 and 1095);

-- Users may edit their name and their Legacy waiting period — nothing billing-related
revoke update on public.profiles from authenticated, anon;
grant update (display_name, legacy_inactivity_days) on public.profiles to authenticated;

-- The plan a user actually has right now (internal)
create or replace function public._effective_plan(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
           when p.plan <> 'free'
                and (p.plan_renews_at is null or p.plan_renews_at > now() or not p.plan_cancel_at_period_end)
           then p.plan
           else 'free'
         end
  from public.profiles p where p.id = p_user;
$$;
revoke all on function public._effective_plan(uuid) from public, anon, authenticated;

create or replace function public.my_plan()
returns table (plan text, effective_plan text, renews_at timestamptz, cancel_at_period_end boolean,
               capsule_count int, legacy_inactivity_days int)
language sql stable security definer set search_path = public as $$
  select p.plan, coalesce(public._effective_plan(p.id), 'free'), p.plan_renews_at, p.plan_cancel_at_period_end,
         (select count(*)::int from public.capsules c where c.user_id = p.id), p.legacy_inactivity_days
  from public.profiles p where p.id = auth.uid();
$$;
grant execute on function public.my_plan() to authenticated;

-- ───────────── Payments (demo provider today; Stripe/QPay later) ─────────────
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan text not null check (plan in ('premium', 'legacy')),
  period text not null check (period in ('month', 'year')),
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'USD',
  provider text not null default 'demo',
  status text not null check (status in ('succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;
create policy "payments: read own" on public.payments for select using (user_id = auth.uid());
-- No insert/update policies: payments are only written by the checkout functions.

-- Prices live in the database so the client can never choose its own amount
create or replace function public.plan_price_cents(p_plan text, p_period text)
returns int language sql immutable as $$
  select case
    when p_plan = 'premium' and p_period = 'month' then 400
    when p_plan = 'premium' and p_period = 'year' then 4000
    when p_plan = 'legacy' and p_period = 'year' then 3900
  end;
$$;

create or replace function public.demo_checkout(p_plan text, p_period text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_amount int := public.plan_price_cents(p_plan, p_period);
  v_payment uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_amount is null then
    raise exception 'INVALID_PLAN';
  end if;

  insert into public.payments (user_id, plan, period, amount_cents, provider, status)
  values (auth.uid(), p_plan, p_period, v_amount, 'demo', 'succeeded')
  returning id into v_payment;

  update public.profiles
     set plan = p_plan,
         plan_renews_at = now() + case when p_period = 'year' then interval '1 year' else interval '1 month' end,
         plan_cancel_at_period_end = false
   where id = auth.uid();

  return v_payment;
end $$;
revoke all on function public.demo_checkout(text, text) from public, anon;
grant execute on function public.demo_checkout(text, text) to authenticated;

create or replace function public.set_cancel_at_period_end(p_cancel boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set plan_cancel_at_period_end = p_cancel
  where id = auth.uid() and plan <> 'free';
end $$;
revoke all on function public.set_cancel_at_period_end(boolean) from public, anon;
grant execute on function public.set_cancel_at_period_end(boolean) to authenticated;

-- ───────────── Plan limits, enforced by the database ─────────────
create or replace function public.enforce_capsule_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plan text := coalesce(public._effective_plan(new.user_id), 'free');
  v_total int;
begin
  if v_plan = 'free' then
    if tg_op = 'INSERT' then
      select count(*) into v_total from public.capsules where user_id = new.user_id;
      if v_total >= 50 then
        raise exception 'FREE_LIMIT_REACHED' using hint = 'Upgrade to Premium for unlimited capsules';
      end if;
    end if;
    if new.kind = 'future' and new.unlock_at > now() + interval '5 years' then
      raise exception 'PLAN_UNLOCK_LIMIT' using hint = 'Free capsules can be sealed for up to 5 years';
    end if;
    if new.media_path ~* '\.(mp4|mov)$' then
      raise exception 'PLAN_VIDEO' using hint = 'Video capsules are a Premium feature';
    end if;
  elsif new.kind = 'future' and new.unlock_at > now() + interval '50 years' then
    raise exception 'UNLOCK_TOO_FAR' using hint = 'Capsules can be sealed for up to 50 years';
  end if;
  return new;
end $$;

drop trigger if exists capsules_limit on public.capsules;
create trigger capsules_limit before insert or update of unlock_at, media_path on public.capsules
  for each row execute function public.enforce_capsule_limit();

-- ───────────── Legacy ─────────────
create table if not exists public.legacy_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  relationship text check (char_length(relationship) <= 40),
  created_at timestamptz not null default now()
);
alter table public.legacy_contacts enable row level security;
create policy "legacy contacts: own" on public.legacy_contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.enforce_legacy_contacts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public._effective_plan(new.user_id), 'free') <> 'legacy' then
    raise exception 'PLAN_LEGACY_REQUIRED';
  end if;
  if (select count(*) from public.legacy_contacts where user_id = new.user_id) >= 5 then
    raise exception 'LEGACY_CONTACT_LIMIT';
  end if;
  return new;
end $$;
drop trigger if exists legacy_contacts_limit on public.legacy_contacts;
create trigger legacy_contacts_limit before insert on public.legacy_contacts
  for each row execute function public.enforce_legacy_contacts();

create table if not exists public.legacy_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.legacy_contacts(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  kind text not null check (kind in ('preview', 'delivery')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  opened_at timestamptz
);
alter table public.legacy_deliveries enable row level security;
create policy "legacy deliveries: read own" on public.legacy_deliveries for select using (user_id = auth.uid());

-- Remember when the user was last active (at most one write per hour)
create or replace function public.touch_last_seen()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now()
  where id = auth.uid() and last_seen_at < now() - interval '1 hour';
$$;
revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

-- Owner previews exactly what their contacts would receive (link valid for 24 hours)
create or replace function public.create_legacy_preview()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_token text;
begin
  if coalesce(public._effective_plan(auth.uid()), 'free') <> 'legacy' then
    raise exception 'PLAN_LEGACY_REQUIRED';
  end if;
  insert into public.legacy_deliveries (user_id, kind, expires_at)
  values (auth.uid(), 'preview', now() + interval '24 hours')
  returning token into v_token;
  return v_token;
end $$;
revoke all on function public.create_legacy_preview() from public, anon;
grant execute on function public.create_legacy_preview() to authenticated;

-- Daily job: users on the Legacy plan who have been inactive past their waiting period
create or replace function public._run_legacy_check()
returns int language plpgsql security definer set search_path = public as $$
declare
  created int;
begin
  insert into public.legacy_deliveries (user_id, contact_id, kind, expires_at)
  select c.user_id, c.id, 'delivery', now() + interval '1 year'
  from public.legacy_contacts c
  join public.profiles p on p.id = c.user_id
  where public._effective_plan(p.id) = 'legacy'
    and p.last_seen_at < now() - make_interval(days => p.legacy_inactivity_days)
    and not exists (
      select 1 from public.legacy_deliveries d where d.contact_id = c.id and d.kind = 'delivery'
    );
  get diagnostics created = row_count;
  return created;
end $$;
revoke all on function public._run_legacy_check() from public, anon, authenticated;

create or replace function public.admin_run_legacy_check()
returns int language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'ADMIN_ONLY';
  end if;
  return public._run_legacy_check();
end $$;
revoke all on function public.admin_run_legacy_check() from public, anon;
grant execute on function public.admin_run_legacy_check() to authenticated;

-- What a recipient sees: the owner's opened memories (never sealed capsules), by secret token
create or replace function public.legacy_view(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d public.legacy_deliveries;
  v_result jsonb;
begin
  select * into d from public.legacy_deliveries where token = p_token and expires_at > now();
  if not found then
    return null;
  end if;
  update public.legacy_deliveries set opened_at = coalesce(opened_at, now()) where id = d.id;

  select jsonb_build_object(
    'kind', d.kind,
    'from', (select display_name from public.profiles where id = d.user_id),
    'to', (select name from public.legacy_contacts where id = d.contact_id),
    'capsules', coalesce((
      select jsonb_agg(jsonb_build_object(
               'title', c.title, 'body', c.body, 'emotion', c.emotion, 'memory_date', c.memory_date,
               'location', c.location_name, 'created_at', c.created_at, 'kind', c.kind,
               'epilogue', c.epilogue, 'has_media', c.media_path is not null)
             order by coalesce(c.memory_date::timestamptz, c.created_at))
      from public.capsules c
      where c.user_id = d.user_id and (c.kind = 'memory' or c.unlock_at <= now())
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;
grant execute on function public.legacy_view(text) to anon, authenticated;

-- Admin overview of deliveries created by the daily check (an email provider would send these links)
create or replace function public.admin_list_legacy_deliveries()
returns table (created_at timestamptz, owner text, contact_name text, contact_email text, token text, opened_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.created_at, p.display_name, c.name, c.email, d.token, d.opened_at
  from public.legacy_deliveries d
  join public.profiles p on p.id = d.user_id
  join public.legacy_contacts c on c.id = d.contact_id
  where d.kind = 'delivery' and public.is_admin()
  order by d.created_at desc
  limit 100;
$$;
grant execute on function public.admin_list_legacy_deliveries() to authenticated;
