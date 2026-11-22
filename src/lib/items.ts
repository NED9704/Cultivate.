import type { ItemStatus, MediaType } from '../../constants/theme';
import { supabase } from './supabase';

/** One row of library_items, as the app uses it. */
export type LibraryItem = {
  id: string;
  title: string;
  media_type: MediaType;
  status: ItemStatus;
  creator: string | null;
  year: number | null;
  cover_image_url: string | null;
  rating: number | null;
  created_at: string;
};

export type NewItem = {
  title: string;
  media_type: MediaType;
  status: ItemStatus;
  creator?: string | null;
  year?: number | null;
  rating?: number | null;
};

// Notes are deliberately not loaded for the list.
const LIST_COLUMNS = 'id, title, media_type, status, creator, year, cover_image_url, rating, created_at';

/** All of the signed-in user's items, newest first. Security rules return only their own. */
export async function fetchItems(): Promise<LibraryItem[]> {
  const { data, error } = await supabase
    .from('library_items')
    .select(LIST_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LibraryItem[];
}

export async function addItem(item: NewItem): Promise<void> {
  const isFinished = item.status === 'finished';
  const { error } = await supabase.from('library_items').insert({
    title: item.title.trim(),
    media_type: item.media_type,
    status: item.status,
    creator: item.creator?.trim() || null,
    year: item.year ?? null,
    rating: isFinished ? (item.rating ?? null) : null,
    finished_date: isFinished ? new Date().toISOString().slice(0, 10) : null,
  });
  if (error) throw error;
}

/** "Norwegian Wood" → "NW", "Circe" → "CI" — for cover placeholders. */
export function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
