-- Cultivate. — a short description (summary / blurb) for each item
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--
-- Filled in from TMDB / Google Books / Open Library when a suggestion is picked,
-- or typed by hand. Not private like notes, but only the owner can read it today
-- (same row security as the rest of the item).

alter table public.library_items
  add column description text check (description is null or char_length(description) <= 5000);
