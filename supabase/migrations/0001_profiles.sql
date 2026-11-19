-- Cultivate. — profiles table
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username is null or char_length(username) between 3 and 30),
  display_name text check (display_name is null or char_length(display_name) <= 50),
  bio text check (bio is null or char_length(bio) <= 300),
  avatar_url text,
  library_visibility text not null default 'private'
    check (library_visibility in ('private', 'friends', 'public')),
  plan text not null default 'free'
    check (plan in ('free', 'supporter')),
  created_at timestamptz not null default now()
);

-- Row Level Security: on, and nothing is allowed unless a policy says so.
alter table public.profiles enable row level security;

-- Start from zero privileges, then grant only what the app needs.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Users may edit these columns only. "plan" and "id" are deliberately left out.
grant update (username, display_name, bio, avatar_url, library_visibility)
  on public.profiles to authenticated;

-- Phase 1: you can only see and edit your own profile.
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Create a profile row automatically when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
