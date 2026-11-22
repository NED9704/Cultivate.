-- Cultivate. — "Delete my account" (required by Apple)
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--
-- Lets a signed-in user permanently delete their own account. Deleting the
-- auth user also deletes their profile and every library item (and its notes),
-- because those tables reference auth.users with "on delete cascade".

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = me;
end;
$$;

-- Only signed-in users may call it, and it only ever deletes the caller.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
