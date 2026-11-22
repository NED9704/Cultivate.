import Feather from '@expo/vector-icons/Feather';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fonts,
  itemStatuses,
  mediaTypes,
  minTapSize,
  radius,
  spacing,
  type ItemStatus,
  type MediaType,
  type ThemeColors,
} from '../../constants/theme';
import { Cover } from '../components/Cover';
import { StarRating } from '../components/StarRating';
import { TmdbCredit } from '../components/TmdbCredit';
import { useAuth } from '../lib/auth';
import { addItem, fetchItem, statusChangeFields, updateItem } from '../lib/items';
import {
  fetchTmdbCreator,
  isTmdbConfigured,
  searchTitles,
  type LookupResult,
} from '../lib/lookup';
import { useTheme, useThemedStyles } from '../lib/theme';

const isMediaType = (v: unknown): v is MediaType => v === 'book' || v === 'movie' || v === 'series';
const isStatus = (v: unknown): v is ItemStatus =>
  v === 'want_to' || v === 'in_progress' || v === 'finished';

const MAX_YEAR = new Date().getFullYear() + 5;
/** Wait this long after you stop typing before looking up books. */
const LOOKUP_DELAY_MS = 450;

export default function AddItemScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Adding: the Library passes the tab and filter you were on, so they're preselected.
  // Editing: the detail screen passes the item's id, and the form fills itself in.
  const params = useLocalSearchParams<{ type?: string; status?: string; id?: string }>();
  const editId = typeof params.id === 'string' && params.id ? params.id : undefined;

  const [type, setType] = useState<MediaType>(isMediaType(params.type) ? params.type : 'book');
  const [status, setStatus] = useState<ItemStatus>(isStatus(params.status) ? params.status : 'want_to');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [year, setYear] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingItem, setLoadingItem] = useState(!!editId);
  const originalStatus = useRef<ItemStatus | null>(null);

  // Title lookup: Open Library for books, TMDB for movies and series
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [source, setSource] = useState<'tmdb' | 'openlibrary' | null>(null);
  const [suggestions, setSuggestions] = useState<LookupResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [findingCreator, setFindingCreator] = useState(false);
  // Only look things up after you type in the title, not when it's filled in for you.
  const [titleTyped, setTitleTyped] = useState(false);
  const lookupAvailable = type === 'book' || isTmdbConfigured;

  useEffect(() => {
    const q = title.trim();
    if (!lookupAvailable || !titleTyped || q.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setSuggestions(await searchTitles(type, q, controller.signal));
      } catch {
        // Offline, cancelled or the service is down: just show no suggestions.
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, LOOKUP_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [title, type, titleTyped, lookupAvailable]);

  async function pickResult(result: LookupResult) {
    setTitle(result.title);
    if (result.creator) setCreator(result.creator);
    if (result.year) setYear(String(result.year));
    setCoverUrl(result.coverUrl);
    // The database records TMDB and Open Library; Google Books results are saved without a source.
    setSource(result.source === 'googlebooks' ? null : result.source);
    setTitleTyped(false);
    setSuggestions([]);
    Keyboard.dismiss();

    // Movies and series: the director / creator needs one more lookup.
    if (result.source === 'tmdb' && result.tmdbId && type !== 'book') {
      setFindingCreator(true);
      const name = await fetchTmdbCreator(type, result.tmdbId);
      setFindingCreator(false);
      if (name) setCreator((current) => (current.trim() ? current : name));
    }
  }

  const creatorRef = useRef<ComponentRef<typeof TextInput>>(null);
  const yearRef = useRef<ComponentRef<typeof TextInput>>(null);

  // Editing: fill the form with the item's current details.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    fetchItem(editId)
      .then((item) => {
        if (cancelled) return;
        setType(item.media_type);
        setStatus(item.status);
        originalStatus.current = item.status;
        setTitle(item.title);
        setCreator(item.creator ?? '');
        setYear(item.year ? String(item.year) : '');
        setRating(item.rating);
        setCoverUrl(item.cover_image_url);
        setSource(item.source);
      })
      .catch(() => !cancelled && setError('Couldn’t load this item. Go back and try again.'))
      .finally(() => !cancelled && setLoadingItem(false));
    return () => {
      cancelled = true;
    };
  }, [editId]);

  if (!session) return <Redirect href="/sign-in" />;

  const typeInfo = mediaTypes.find((m) => m.key === type)!;

  async function handleSave() {
    if (saving) return;
    setError(null);

    if (!title.trim()) {
      setError('Add a title first.');
      return;
    }
    let yearNumber: number | null = null;
    if (year.trim()) {
      yearNumber = Number(year);
      if (!/^\d{4}$/.test(year.trim()) || yearNumber < 1000 || yearNumber > MAX_YEAR) {
        setError('Year should be four digits, like 2019.');
        return;
      }
    }

    setSaving(true);
    try {
      if (editId) {
        await updateItem(editId, {
          // Status-related fields (finished date, clearing the rating) only when it changed.
          ...(status !== originalStatus.current ? statusChangeFields(status) : {}),
          title,
          media_type: type,
          creator,
          year: yearNumber,
          cover_image_url: coverUrl,
          // Only when a lookup was used, so editing still works before migration 0004 runs.
          ...(source ? { source } : {}),
          rating: status === 'finished' ? rating : null,
        });
      } else {
        await addItem({
          title,
          media_type: type,
          status,
          creator,
          year: yearNumber,
          rating,
          cover_image_url: coverUrl,
          source,
        });
      }
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(
        message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')
          ? 'Couldn’t reach the server. Check your connection and try again.'
          : `Couldn’t save it: ${message}`,
      );
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading} accessibilityRole="header">
            {editId ? 'Edit details' : 'Add to your shelf'}
          </Text>

          {loadingItem && <ActivityIndicator color={colors.textSecondary} style={styles.loader} />}

          {/* 1. Type */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.optionRow}>
            {mediaTypes.map((m) => {
              const selected = m.key === type;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setType(m.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Feather
                    name={m.icon}
                    size={16}
                    color={selected ? colors.accentText : colors.textSecondary}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{m.singular}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* 2. Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setTitleTyped(true);
            }}
            autoFocus={!editId}
            placeholder={type === 'book' ? 'Norwegian Wood' : type === 'movie' ? 'Spirited Away' : 'Fleabag'}
            placeholderTextColor={colors.muted}
            accessibilityLabel="Title"
            returnKeyType="next"
            onSubmitEditing={() => creatorRef.current?.focus()}
            submitBehavior="submit"
            maxLength={300}
            style={styles.input}
          />

          {/* Suggestions: Open Library for books, TMDB for movies and series */}
          {searching && suggestions.length === 0 && (
            <Text style={styles.hint}>Looking up {typeInfo.label.toLowerCase()}…</Text>
          )}
          {suggestions.length > 0 && (
            <View style={styles.suggestions} accessibilityLabel={`Suggested ${typeInfo.label.toLowerCase()}`}>
              {suggestions.map((r, i) => (
                <Pressable
                  key={r.key}
                  onPress={() => pickResult(r)}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.title}${r.creator ? ` by ${r.creator}` : ''}${
                    r.year ? `, ${r.year}` : ''
                  }`}
                  style={({ pressed }) => [
                    styles.suggestion,
                    i > 0 && styles.suggestionDivider,
                    pressed && styles.pressed,
                  ]}
                >
                  <Cover title={r.title} type={type} imageUrl={r.coverUrl} width={34} />
                  <View style={styles.suggestionText}>
                    <Text style={styles.suggestionTitle} numberOfLines={2}>
                      {r.title}
                    </Text>
                    {(r.creator || r.year) && (
                      <Text style={styles.suggestionDetails} numberOfLines={1}>
                        {[r.creator, r.year].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
              {suggestions[0].source === 'tmdb' ? (
                <TmdbCredit style={styles.suggestionsCredit} />
              ) : (
                <Text style={styles.credit}>
                  Book info from {suggestions[0].source === 'googlebooks' ? 'Google Books' : 'Open Library'}
                </Text>
              )}
            </View>
          )}

          {/* The chosen cover, with a way to remove it */}
          {coverUrl && (
            <View style={styles.coverRow}>
              <Cover title={title || '?'} type={type} imageUrl={coverUrl} width={40} />
              <Text style={styles.hint}>
                {coverUrl.startsWith('https://image.tmdb.org')
                  ? 'Poster from TMDB'
                  : coverUrl.includes('books.google')
                    ? 'Cover from Google Books'
                    : 'Cover from Open Library'}
              </Text>
              <Pressable
                onPress={() => setCoverUrl(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove cover"
                style={styles.removeCover}
              >
                <Text style={styles.removeCoverText}>Remove</Text>
              </Pressable>
            </View>
          )}

          {/* 3. Optional details */}
          <Text style={styles.label}>
            {typeInfo.creatorLabel} <Text style={styles.optional}>(optional)</Text>
            {findingCreator ? <Text style={styles.optional}> · looking it up…</Text> : null}
          </Text>
          <TextInput
            ref={creatorRef}
            value={creator}
            onChangeText={setCreator}
            placeholderTextColor={colors.muted}
            accessibilityLabel={`${typeInfo.creatorLabel}, optional`}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => yearRef.current?.focus()}
            submitBehavior="submit"
            maxLength={200}
            style={styles.input}
          />

          <Text style={styles.label}>
            Year <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            ref={yearRef}
            value={year}
            onChangeText={(t) => setYear(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel="Year, optional"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.yearInput]}
          />

          <Text style={styles.label}>Status</Text>
          <View style={styles.optionRow}>
            {itemStatuses.map((s) => {
              const selected = s.key === status;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => setStatus(s.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {status === 'finished' && (
            <>
              <Text style={styles.label}>
                Rating <Text style={styles.optional}>(optional)</Text>
              </Text>
              <StarRating
                value={rating}
                onChange={setRating}
                size={28}
                color={colors.accentText}
                emptyColor={colors.divider}
              />
            </>
          )}

          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.pressed]}
          >
            {saving ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: c.background },
    topBar: {
      flexDirection: 'row',
      paddingHorizontal: spacing.sm,
    },
    cancel: { minHeight: minTapSize, justifyContent: 'center', paddingHorizontal: spacing.sm },
    cancelText: { fontFamily: fonts.bodyMedium, fontSize: 17, color: c.textSecondary },
    content: {
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    heading: {
      fontFamily: fonts.display,
      fontSize: 28,
      color: c.heading,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    label: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: c.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.xs + 2,
    },
    optional: { fontFamily: fonts.body },
    optionRow: { flexDirection: 'row', gap: spacing.sm },
    option: {
      flex: 1,
      minHeight: minTapSize + 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs + 2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.divider,
      paddingHorizontal: spacing.xs,
    },
    optionSelected: { borderColor: c.accentText, borderWidth: 1.5 },
    optionText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: c.textSecondary },
    optionTextSelected: { fontFamily: fonts.bodyBold, color: c.accentText },
    input: {
      minHeight: minTapSize + 6,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: c.surface,
      color: c.onSurface,
      fontFamily: fonts.body,
      fontSize: 17,
    },
    yearInput: { width: 120 },
    hint: { fontFamily: fonts.body, fontSize: 13, color: c.textSecondary, marginTop: spacing.sm },
    suggestions: {
      marginTop: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.divider,
      paddingHorizontal: spacing.sm + 2,
    },
    suggestion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm + 2,
      minHeight: minTapSize + 12,
      paddingVertical: spacing.sm,
    },
    suggestionDivider: { borderTopWidth: 1, borderTopColor: c.divider },
    suggestionText: { flex: 1 },
    suggestionTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: c.text, lineHeight: 20 },
    suggestionDetails: { fontFamily: fonts.body, fontSize: 13, color: c.textSecondary, marginTop: 2 },
    suggestionsCredit: { paddingTop: spacing.xs, paddingBottom: spacing.sm + 2 },
    credit: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: c.textSecondary,
      textAlign: 'right',
      paddingBottom: spacing.sm,
    },
    coverRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm + 2,
      marginTop: spacing.sm,
    },
    removeCover: { minHeight: minTapSize, justifyContent: 'center', paddingHorizontal: spacing.sm },
    removeCoverText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: c.accentText,
      textDecorationLine: 'underline',
    },
    loader: { marginVertical: spacing.md },
    error: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: c.errorText,
      marginTop: spacing.md,
    },
    saveButton: {
      marginTop: spacing.xl,
      minHeight: minTapSize + 8,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.8 },
    saveText: { fontFamily: fonts.bodyBold, fontSize: 17, color: c.onAccent },
  });
