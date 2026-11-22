// Title lookup while adding an item:
// - Books: Open Library (free, no key) — https://openlibrary.org/developers/api
// - Movies and series: TMDB (free key in .env) — https://developer.themoviedb.org
// If a service can't be reached, lookups return nothing and the user types the
// details by hand.

import type { MediaType } from '../../constants/theme';

export type LookupSource = 'openlibrary' | 'tmdb';

export type LookupResult = {
  key: string;
  source: LookupSource;
  title: string;
  /** Author for books. For movies/series it's filled in after you pick one. */
  creator: string | null;
  year: number | null;
  coverUrl: string | null;
  /** TMDB id, used to fetch the director / creator when picked. */
  tmdbId?: number;
};

// ---------- Open Library (books) ----------

const OL_SEARCH_URL = 'https://openlibrary.org/search.json';
const OL_COVERS_URL = 'https://covers.openlibrary.org/b/id';
// Open Library asks apps to identify themselves. Generic on purpose: no personal details.
const OL_USER_AGENT = 'Cultivate/1.0 (iOS reading list app)';

type OlDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
};

/** Cover image for an Open Library cover id. Sizes: S (small), M (medium), L (large). */
export function bookCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
  return `${OL_COVERS_URL}/${coverId}-${size}.jpg`;
}

async function searchBooks(title: string, signal?: AbortSignal, limit = 5): Promise<LookupResult[]> {
  const params = new URLSearchParams({
    title: title.trim(),
    fields: 'key,title,author_name,first_publish_year,cover_i',
    limit: String(limit),
  });
  const res = await fetch(`${OL_SEARCH_URL}?${params.toString()}`, {
    signal,
    headers: { 'User-Agent': OL_USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Open Library returned ${res.status}`);
  const json = (await res.json()) as { docs?: OlDoc[] };
  return (json.docs ?? [])
    .filter((d) => d.key && d.title)
    .map((d) => ({
      key: `ol:${d.key}`,
      source: 'openlibrary' as const,
      title: d.title!,
      creator: d.author_name?.[0] ?? null,
      year: typeof d.first_publish_year === 'number' ? d.first_publish_year : null,
      coverUrl: typeof d.cover_i === 'number' ? bookCoverUrl(d.cover_i, 'M') : null,
    }));
}

// ---------- TMDB (movies and series) ----------

const TMDB_API = 'https://api.themoviedb.org/3';
const TMDB_IMAGES = 'https://image.tmdb.org/t/p';
// The "API Read Access Token" from your TMDB account settings, kept in .env.
const TMDB_TOKEN = process.env.EXPO_PUBLIC_TMDB_READ_TOKEN ?? '';

/** False until the TMDB token is in .env: movie/series lookup is then skipped. */
export const isTmdbConfigured = TMDB_TOKEN.length > 20;

type TmdbMovie = { id: number; title?: string; release_date?: string; poster_path?: string | null };
type TmdbShow = { id: number; name?: string; first_air_date?: string; poster_path?: string | null };

function tmdbFetch(path: string, params: Record<string, string>, signal?: AbortSignal) {
  const qs = new URLSearchParams({ language: 'en-US', ...params }).toString();
  return fetch(`${TMDB_API}${path}?${qs}`, {
    signal,
    headers: { Authorization: `Bearer ${TMDB_TOKEN}`, Accept: 'application/json' },
  });
}

function yearOf(date?: string): number | null {
  const y = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isFinite(y) && y > 1000 ? y : null;
}

/** Poster image for a TMDB poster path. w342 is sharp on phones without being large. */
export function posterUrl(path: string, size: 'w185' | 'w342' | 'w500' = 'w342'): string {
  return `${TMDB_IMAGES}/${size}${path}`;
}

async function searchTmdb(
  type: 'movie' | 'series',
  title: string,
  signal?: AbortSignal,
  limit = 5,
): Promise<LookupResult[]> {
  if (!isTmdbConfigured) return [];
  const res = await tmdbFetch(
    type === 'movie' ? '/search/movie' : '/search/tv',
    { query: title.trim(), include_adult: 'false', page: '1' },
    signal,
  );
  if (!res.ok) throw new Error(`TMDB returned ${res.status}`);
  const json = (await res.json()) as { results?: (TmdbMovie & TmdbShow)[] };
  return (json.results ?? [])
    .slice(0, limit)
    .map((r) => {
      const name = type === 'movie' ? r.title : r.name;
      return {
        key: `tmdb:${type}:${r.id}`,
        source: 'tmdb' as const,
        tmdbId: r.id,
        title: name ?? '',
        creator: null,
        year: yearOf(type === 'movie' ? r.release_date : r.first_air_date),
        coverUrl: r.poster_path ? posterUrl(r.poster_path) : null,
      };
    })
    .filter((r) => r.title);
}

/** The director (movies) or creators (series) for a TMDB result, or null. */
export async function fetchTmdbCreator(type: 'movie' | 'series', tmdbId: number): Promise<string | null> {
  if (!isTmdbConfigured) return null;
  try {
    if (type === 'movie') {
      const res = await tmdbFetch(`/movie/${tmdbId}/credits`, {});
      if (!res.ok) return null;
      const json = (await res.json()) as { crew?: { job?: string; name?: string }[] };
      const directors = (json.crew ?? []).filter((c) => c.job === 'Director' && c.name).map((c) => c.name!);
      return directors.length ? [...new Set(directors)].slice(0, 2).join(', ') : null;
    }
    const res = await tmdbFetch(`/tv/${tmdbId}`, {});
    if (!res.ok) return null;
    const json = (await res.json()) as { created_by?: { name?: string }[] };
    const creators = (json.created_by ?? []).map((c) => c.name).filter(Boolean) as string[];
    return creators.length ? creators.slice(0, 2).join(', ') : null;
  } catch {
    return null;
  }
}

// ---------- One entry point for the add form ----------

/** Suggestions for a title, from the right service for the type. Throws AbortError if cancelled. */
export function searchTitles(type: MediaType, title: string, signal?: AbortSignal): Promise<LookupResult[]> {
  return type === 'book' ? searchBooks(title, signal) : searchTmdb(type, title, signal);
}
