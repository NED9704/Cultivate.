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
  cover_image_url?: string | null;
  /** Where the details came from, if looked up ('tmdb' items must show the TMDB credit). */
  source?: 'tmdb' | 'openlibrary' | null;
  /** Short summary, from a lookup or typed by hand. */
  description?: string | null;
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
    cover_image_url: item.cover_image_url ?? null,
    // Only sent when looked up, so typing by hand still works before migration 0004 runs.
    ...(item.source ? { source: item.source } : {}),
    ...(item.description?.trim() ? { description: item.description.trim() } : {}),
    rating: isFinished ? (item.rating ?? null) : null,
    finished_date: isFinished ? today() : null,
  });
  if (error) throw error;
}

/** One item with everything the detail screen needs, including the private notes. */
export type ItemDetail = LibraryItem & {
  notes: string | null;
  finished_date: string | null;
  source: 'tmdb' | 'openlibrary' | null;
  description: string | null;
};

export async function fetchItem(id: string): Promise<ItemDetail> {
  const { data, error } = await supabase
    .from('library_items')
    .select(`${LIST_COLUMNS}, notes, finished_date, source, description`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as ItemDetail;
}

export type ItemPatch = Partial<{
  title: string;
  media_type: MediaType;
  status: ItemStatus;
  creator: string | null;
  year: number | null;
  rating: number | null;
  notes: string | null;
  finished_date: string | null;
  cover_image_url: string | null;
  source: 'tmdb' | 'openlibrary' | null;
  description: string | null;
}>;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The extra fields that go with a status change: moving to Done stamps today's
 * date; moving away from Done clears the rating and date (ratings are only for
 * finished items).
 */
export function statusChangeFields(status: ItemStatus): ItemPatch {
  return status === 'finished'
    ? { status, finished_date: today() }
    : { status, rating: null, finished_date: null };
}

export async function updateItem(id: string, patch: ItemPatch): Promise<void> {
  const clean: ItemPatch = { ...patch };
  if (clean.title !== undefined) clean.title = clean.title.trim();
  if (clean.creator !== undefined) clean.creator = clean.creator?.trim() || null;
  if (clean.description !== undefined) clean.description = clean.description?.trim() || null;
  const { error } = await supabase.from('library_items').update(clean).eq('id', id);
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('library_items').delete().eq('id', id);
  if (error) throw error;
}

/** "Norwegian Wood" → "NW", "Circe" → "CI" — for cover placeholders. */
export function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
