# Cultivate. — project brief for Claude

## What we're building

**Cultivate.** (the period is part of the name) is an iPhone-first app where people keep one personal library of the **books, movies and TV series** they have finished or want to get to, with **private notes** on each one. Later, they can share their library with friends or make it public.

Target: launch on the Apple App Store. Audience: general consumers, non-technical. Adding an item must take under 15 seconds.

## Who you're working with

The owner is a **beginner with no coding experience**, working 5–10 hours a week on a Mac.

- Explain what you're about to do in plain language before you do it, and keep explanations short.
- When I need to do something myself (create an account, scan a QR code, paste a key), give me numbered steps.
- Build **one feature at a time**. After each one, tell me how to test it on my iPhone, then commit to git with a clear message.
- Ask before adding a new paid service or a large dependency.
- Never commit secrets. API keys go in `.env` (which is in `.gitignore`), and you tell me where to find each value.

## Tech stack

- **Expo** (latest stable SDK), **TypeScript**, **Expo Router** for navigation
- **Supabase** for auth (email + password, plus Sign in with Apple) and the database, with Row Level Security on every table
- Testing on device with **Expo Go**; later **EAS Build** and **EAS Submit** for TestFlight and the App Store (no Mac build tools needed)
- Later, for in-app purchases: **RevenueCat** (`react-native-purchases`). This needs a development build rather than Expo Go.
- Book lookup: Open Library search API (free, no key). Movies and series: TMDB, once I've checked its terms. It requires attribution.

## Data model (Supabase)

**profiles**: id (= auth user id), username (unique), display_name, bio, avatar_url, library_visibility (`private` | `friends` | `public`, default `private`), plan (`free` | `supporter`, default `free`, not editable by the user), created_at

**library_items**: id, user_id, title (required), media_type (`book` | `movie` | `series`), status (`want_to` | `in_progress` | `finished`, default `want_to`), creator, year, cover_image_url, rating (1–5, only when finished), notes (private to the owner, always), tags (text[]), finished_date, created_at, updated_at

**friendships** (phase 2): id, requester_id, recipient_id, status (`pending` | `accepted` | `declined`), created_at

Rules: users only read and write their own items. Notes are **never** visible to anyone else, even on a public library. Friends and public visitors can only see items, according to the owner's library_visibility.

## Screens (phase 1)

1. **Sign in / sign up**, with links to Privacy Policy and Terms visible *before* sign-up.
2. **Library (home)**: Books / Movies / Series tabs; Want to / In progress / Finished filter chips; item cards showing cover (or a coloured placeholder with initials), title, creator, status and star rating; a search box that filters by title.
3. **Add item**: a large "+" button opens a short form. Type first, then title, then optional fields. Saving goes back to the Library.
4. **Item detail**: one-tap status change, rating, a large notes area, Edit and Delete (with confirmation).
5. **Settings**: display name, sign out, Privacy Policy and Terms links, and **Delete my account**, which permanently deletes the user and all their data after confirmation. Apple requires this.

Phase 2 adds profiles with a username, a public link `/u/{username}`, friend requests, and viewing a friend's library. Phase 3 adds onboarding ("Add your first 3 items"), polish, the app icon and splash screen.

## Design

Dark, warm and cosy, like a cafe-bookshop that smells of coffee and hot chocolate. Keep all colours in one theme file (`constants/theme.ts`).

| Token | Hex | Use |
|---|---|---|
| background | #362304 | Chocolate brown: app background |
| text / primary | #FBF4E9 | Creme: main text, headings, primary buttons (button text #362304) |
| surface | #E6D5BE | Latte beige: cards, inputs, tab bar. Text on it is #362304, never creme. |
| muted | #6B4532 | Milk chocolate: secondary text, icons and borders **on beige cards only**. On the dark background, use #E6D5BE for secondary text. |
| accent | #B85E00 | Sienna: "+" button, active tab, stars, highlights. Text on it is #362304, bold. |
| book | #B85E00 | Books accent |
| movie | #A87452 | Movies accent (light mocha) |
| series | #C9A06A | Series accent (caramel) |

Media-type colours are always paired with an icon and a label, never colour alone.

**Fonts**
- Logo and the three category headings (Books, Movies, Series): a chunky, rounded display font. Use **Bagel Fat One** (`@expo-google-fonts/bagel-fat-one`) until I add a licensed "Extra Chunk Please" font file to `assets/fonts/`. Don't add that file unless I confirm I have an app licence.
- Everything else: **Helvetica Neue**. It's built into iOS, so use `fontFamily: 'Helvetica Neue'` with the system font as the fallback on Android. Never bundle Helvetica font files.

Style: soft warm shadows, rounded cards, large tap targets (44 pt minimum), portrait only, iPad layout must also work (Apple often reviews on iPad). Every text must stay readable against its background. Clear empty states, e.g. "Your shelf is empty — add the last thing you read or watched".

## Not yet

No friends, sharing, public profiles, payments or ads until phase 1 works on my phone.
