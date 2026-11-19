// Cultivate. theme — every colour and font lives here.
// Warm and cosy: a cafe-bookshop that smells of coffee and hot chocolate.
// Two modes: dark (chocolate background, creme text) and light (the two swapped).

const darkColors = {
  /** Dark hot-chocolate brown: app background */
  background: '#261505',
  /** Creme: main text */
  text: '#FBF4E9',
  /** Secondary text on the background */
  textSecondary: '#E6D5BE',
  /** Primary button and its text */
  primary: '#FBF4E9',
  onPrimary: '#362304',
  /** The "Cultivate." letters (the dot uses accentText) */
  logo: '#E6D5BE',
  /** Latte beige: cards */
  surface: '#E6D5BE',
  /** Text on beige cards (never creme) */
  onSurface: '#362304',
  /** Milk chocolate: secondary text, icons, borders on beige cards */
  muted: '#6B4532',
  /** Text field background on cards */
  inputBackground: '#FBF4E9',
  /** Sienna: "+" button, stars, highlights, filled buttons */
  accent: '#B85E00',
  /** Text on sienna (always bold) */
  onAccent: '#362304',
  /** Sienna for text and icons on the background (shade chosen so it stays readable):
   *  the selected Books / Movies / Series word, the heading and the logo dot */
  accentText: '#D9781F',
  /** Thin divider lines on the background */
  divider: '#6B4532',
  /** Error messages on beige cards */
  error: '#8A2A00',
  /** Soft warm shadow */
  shadow: '#1A1002',
  /** Media-type accents — always pair with an icon and a label */
  book: '#B85E00',
  movie: '#A87452',
  series: '#C9A06A',
};

export type ThemeColors = typeof darkColors;

const lightColors: ThemeColors = {
  background: '#FBF4E9',
  text: '#2E1A06',
  textSecondary: '#6B4532',
  primary: '#2E1A06',
  onPrimary: '#FBF4E9',
  logo: '#2E1A06',
  surface: '#E6D5BE',
  onSurface: '#362304',
  muted: '#6B4532',
  inputBackground: '#FBF4E9',
  accent: '#B85E00',
  onAccent: '#362304',
  accentText: '#B85E00',
  divider: '#D9C4A8',
  error: '#8A2A00',
  shadow: '#6B4532',
  book: '#B85E00',
  movie: '#A87452',
  series: '#C9A06A',
};

export type ColorScheme = 'light' | 'dark';

export const palettes: Record<ColorScheme, ThemeColors> = {
  dark: darkColors,
  light: lightColors,
};

/** Soft warm shadow for cards, per mode */
export function cardShadow(scheme: ColorScheme, c: ThemeColors) {
  return {
    shadowColor: c.shadow,
    shadowOpacity: scheme === 'dark' ? 0.35 : 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  } as const;
}

export type MediaType = 'book' | 'movie' | 'series';

/** icon = a Feather line icon name (outline only, no fill) */
export const mediaTypes: {
  key: MediaType;
  label: string;
  icon: 'book-open' | 'film' | 'tv';
}[] = [
  { key: 'book', label: 'Books', icon: 'book-open' },
  { key: 'movie', label: 'Movies', icon: 'film' },
  { key: 'series', label: 'Series', icon: 'tv' },
];

/** Matches library_items.status in the database. "finished" is shown as "Done". */
export type ItemStatus = 'want_to' | 'in_progress' | 'finished';

export const itemStatuses: { key: ItemStatus; label: string }[] = [
  { key: 'want_to', label: 'Want to' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'finished', label: 'Done' },
];

export const fonts = {
  /** Chunky display font: logo and the Books / Movies / Series headings only.
   *  Swap for "Extra Chunk Please" once a licensed file is in assets/fonts/. */
  display: 'BagelFatOne_400Regular',
  /** Everything else: DM Sans. Each weight is its own font file, so use these
   *  instead of fontWeight (fontWeight doesn't pick a weight for custom fonts). */
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

/** Minimum tap target size (Apple guideline) */
export const minTapSize = 44;
