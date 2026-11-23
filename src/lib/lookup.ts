// Title lookup while adding an item:
// - Books: Open Library (free, no key) — https://openlibrary.org/developers/api
//   with Google Books as a backup when Open Library can't be reached (some
//   networks block it) — https://developers.google.com/books
// - Movies and series: TMDB (free key in .env) — https://developer.themoviedb.org
// If no service can be reached, lookups return nothing and the user types the
// details by hand.

import type { MediaType } from '../../constants/theme';

export type LookupSource = 'openlibrary' | 'googlebooks' | 'tmdb';

export type LookupResult = {
  key: string;
  source: LookupSource;
  title: string;
  /** Author for books. For movies/series it's filled in after you pick one. */
  creator: string | null;
  year: number | null;
  coverUrl: string | null;
  /** Short summary. Open Library books get theirs after you pick one. */
  description: string | null;
  /** TMDB id, used to fetch the director / creator when picked. */
  tmdbId?: number;
  /** Open Library work key (e.g. "/works/OL123W"), used to fetch the description when picked. */
  olWorkKey?: string;
};

/** Longest description we keep; longer ones are cut at a sentence end. */
const MAX_DESCRIPTION = 1500;

/**
 * Turns a description from any source into plain text: removes web formatting
 * (Google Books), Open Library's source links and separators, and extra spaces.
 */
export function cleanDescription(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Open Library: "([source][1])", footnote link lists and "----------" sections
    .split(/\n-{3,}/)[0]
    .replace(/\(\[[^\]]*\]\[\d+\]\)/g, '')
    .replace(/^\s*\[\d+\]:.*$/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!text) return null;
  if (text.length > MAX_DESCRIPTION) {
    const cut = text.slice(0, MAX_DESCRIPTION);
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    text = (lastStop > 400 ? cut.slice(0, lastStop + 1) : cut.trimEnd() + '…').trim();
  }
  return text;
}

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

/** Give Open Library this long before trying the backup. */
const OL_TIMEOUT_MS = 3000;

/** Books: Open Library first, Google Books if Open Library fails or is too slow. */
async function searchBooks(title: string, signal?: AbortSignal, limit = 5): Promise<LookupResult[]> {
  // Our own controller, so a slow Open Library can be cut off without
  // cancelling the whole search.
  const olController = new AbortController();
  const onOuterAbort = () => olController.abort();
  signal?.addEventListener('abort', onOuterAbort);
  const timer = setTimeout(() => olController.abort(), OL_TIMEOUT_MS);
  try {
    return await searchOpenLibrary(title, olController.signal, limit);
  } catch (e) {
    if (signal?.aborted) throw e; // the user typed something new: stop here
    if (!isGoogleBooksConfigured) throw e;
    return searchGoogleBooks(title, signal, limit);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}

async function searchOpenLibrary(title: string, signal: AbortSignal, limit: number): Promise<LookupResult[]> {
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
      description: null,
      olWorkKey: d.key!.startsWith('/works/') ? d.key : undefined,
    }));
}

/** The description of an Open Library work, or null (also if it can't be reached in time). */
export async function fetchOpenLibraryDescription(workKey: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OL_TIMEOUT_MS + 1000);
  try {
    const res = await fetch(`https://openlibrary.org${workKey}.json`, {
      signal: controller.signal,
      headers: { 'User-Agent': OL_USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { description?: string | { value?: string } };
    const raw = typeof json.description === 'string' ? json.description : json.description?.value;
    return cleanDescription(raw);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Google Books (backup for books) ----------

const GB_SEARCH_URL = 'https://www.googleapis.com/books/v1/volumes';
// Free key restricted to the Books API, kept in .env.
const GB_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_KEY ?? '';
export const isGoogleBooksConfigured = GB_KEY.length > 20;

type GbVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

async function searchGoogleBooks(title: string, signal: AbortSignal | undefined, limit: number) {
  const params = new URLSearchParams({
    q: `intitle:${title.trim()}`,
    maxResults: String(limit),
    printType: 'books',
    fields: 'items(id,volumeInfo(title,authors,publishedDate,description,imageLinks/thumbnail))',
    key: GB_KEY,
  });
  const res = await fetch(`${GB_SEARCH_URL}?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Google Books returned ${res.status}`);
  const json = (await res.json()) as { items?: GbVolume[] };
  return (json.items ?? [])
    .filter((v) => v.id && v.volumeInfo?.title)
    .map((v): LookupResult => {
      const info = v.volumeInfo!;
      const thumb = info.imageLinks?.thumbnail;
      return {
        key: `gb:${v.id}`,
        source: 'googlebooks',
        title: info.title!,
        creator: info.authors?.[0] ?? null,
        year: yearOf(info.publishedDate),
        // Google sends http:// links; iPhones need https.
        coverUrl: thumb ? thumb.replace(/^http:\/\//, 'https://') : null,
        description: cleanDescription(info.description),
      };
    });
}

// ---------- TMDB (movies and series) ----------

const TMDB_API = 'https://api.themoviedb.org/3';
const TMDB_IMAGES = 'https://image.tmdb.org/t/p';
// The "API Read Access Token" from your TMDB account settings, kept in .env.
const TMDB_TOKEN = process.env.EXPO_PUBLIC_TMDB_READ_TOKEN ?? '';

/** False until the TMDB token is in .env: movie/series lookup is then skipped. */
export const isTmdbConfigured = TMDB_TOKEN.length > 20;

type TmdbMovie = {
  id: number;
  title?: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
};
type TmdbShow = {
  id: number;
  name?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
};

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
        description: cleanDescription(r.overview),
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
