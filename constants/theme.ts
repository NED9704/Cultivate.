// Cultivate. theme — every colour and font lives here.
// Dark, warm and cosy: a cafe-bookshop that smells of coffee and hot chocolate.
import { Platform } from 'react-native';

export const colors = {
  /** Chocolate brown: app background */
  background: '#362304',
  /** Creme: main text, headings, primary buttons */
  text: '#FBF4E9',
  primary: '#FBF4E9',
  /** Text on a creme primary button */
  onPrimary: '#362304',
  /** Latte beige: cards, inputs, tab bar */
  surface: '#E6D5BE',
  /** Text on beige surfaces (never creme) */
  onSurface: '#362304',
  /** Milk chocolate: secondary text, icons, borders — on beige cards ONLY */
  muted: '#6B4532',
  /** Secondary text on the dark background */
  textSecondary: '#E6D5BE',
  /** Sienna: "+" button, active tab, stars, highlights */
  accent: '#B85E00',
  /** Text on sienna (always bold) */
  onAccent: '#362304',
  /** Media-type accents — always pair with an icon and a label */
  book: '#B85E00',
  movie: '#A87452',
  series: '#C9A06A',
  /** Soft warm shadow */
  shadow: '#1A1002',
} as const;

export type MediaType = 'book' | 'movie' | 'series';

export const mediaTypes: { key: MediaType; label: string; icon: string; color: string }[] = [
  { key: 'book', label: 'Books', icon: '📖', color: colors.book },
  { key: 'movie', label: 'Movies', icon: '🎬', color: colors.movie },
  { key: 'series', label: 'Series', icon: '📺', color: colors.series },
];

export const fonts = {
  /** Chunky display font: logo and the Books / Movies / Series headings only.
   *  Swap for "Extra Chunk Please" once a licensed file is in assets/fonts/. */
  display: 'BagelFatOne_400Regular',
  /** Everything else: Helvetica Neue on iOS (built in), system font elsewhere. */
  body: Platform.select({ ios: 'Helvetica Neue', default: undefined }),
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

/** Minimum tap target size (Apple guideline) */
export const minTapSize = 44;

export const shadow = {
  shadowColor: colors.shadow,
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const;
