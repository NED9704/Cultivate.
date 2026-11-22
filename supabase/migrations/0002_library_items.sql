-- Cultivate. — library_items table
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 300),
  media_type text not null check (media_type in ('book', 'movie', 'series')),
  status text not null default 'want_to'
    check (status in ('want_to', 'in_progress', 'finished')),
  creator text check (creator is null or char_length(creator) <= 200),
  year int check (year is null or year between 1000 and 2100),
  cover_image_url text,
  rating int check (rating is null or rating between 1 and 5),
  notes text check (notes is null or char_length(notes) <= 20000), -- always private to the owner
  tags text[] not null default '{}',
  finished_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A rating only makes sense once you've finished it.
  constraint rating_only_when_finished check (rating is null or status = 'finished')
);

create index library_items_user_idx on public.library_items (user_id, media_type, status);

-- Keep updated_at current on every edit.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger library_items_set_updated_at
  before update on public.library_items
  for each row execute procedure public.set_updated_at();

-- Row Level Security: on, and nothing is allowed unless a policy says so.
alter table public.library_items enable row level security;

revoke all on public.library_items from anon, authenticated;
grant select, insert, update, delete on public.library_items to authenticated;

-- You can only ever see and change your own items.
create policy "Users can view their own items"
  on public.library_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own items"
  on public.library_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own items"
  on public.library_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own items"
  on public.library_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);
