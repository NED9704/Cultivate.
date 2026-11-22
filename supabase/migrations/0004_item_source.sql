-- Cultivate. — remember where an item's details came from
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--
-- 'tmdb' items must show the TMDB credit; 'openlibrary' items credit Open Library.
-- Typed by hand = null.

alter table public.library_items
  add column source text check (source is null or source in ('tmdb', 'openlibrary'));
