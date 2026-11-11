-- MemoryVerse — let owners delete any of their capsules, including sealed ones.
-- (A sealed capsule is hidden from SELECT, so a plain DELETE cannot reach it.)
-- Run once in Supabase: SQL Editor → New query → paste → Run

create or replace function public.delete_my_capsule(p_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_path text;
begin
  delete from public.capsules
  where id = p_id and user_id = auth.uid()
  returning media_path into v_path;

  if not found then
    raise exception 'CAPSULE_NOT_FOUND';
  end if;

  return v_path; -- the client removes the media file with the Storage API
end $$;

revoke all on function public.delete_my_capsule(uuid) from public, anon;
grant execute on function public.delete_my_capsule(uuid) to authenticated;
