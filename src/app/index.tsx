import Feather from '@expo/vector-icons/Feather';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  cardShadow,
  fonts,
  itemStatuses,
  mediaTypes,
  minTapSize,
  radius,
  spacing,
  type ColorScheme,
  type ItemStatus,
  type MediaType,
  type ThemeColors,
} from '../../constants/theme';
import { Cover } from '../components/Cover';
import { Logo } from '../components/Logo';
import { StarRating } from '../components/StarRating';
import { useAuth } from '../lib/auth';
import { fetchItems, type LibraryItem } from '../lib/items';
import { useTheme, useThemedStyles } from '../lib/theme';

const emptyMessages: Record<MediaType, Record<ItemStatus, string>> = {
  book: {
    want_to: 'No books on your wishlist yet — add one you’d love to read.',
    in_progress: 'You’re not reading anything right now — add the book on your nightstand.',
    finished: 'Your shelf is empty — add the last thing you read.',
  },
  movie: {
    want_to: 'No movies on your watchlist yet — add one you’ve been meaning to see.',
    in_progress: 'Nothing on the go — add a movie you’ve started.',
    finished: 'No movies yet — add the last one you watched.',
  },
  series: {
    want_to: 'No series on your watchlist yet — add a show you want to start.',
    in_progress: 'Not watching a show right now — add the one you’re hooked on.',
    finished: 'No finished series yet — add the last show you binged.',
  },
};

export default function LibraryScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [activeType, setActiveType] = useState<MediaType>('book');
  // Each tab remembers its own status filter.
  const [statusByType, setStatusByType] = useState<Record<MediaType, ItemStatus>>({
    book: 'want_to',
    movie: 'want_to',
    series: 'want_to',
  });
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setItems(await fetchItems());
    } catch {
      setLoadError('Couldn’t load your shelf. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever the Library comes back into view, e.g. after adding an item.
  useFocusEffect(
    useCallback(() => {
      if (session) load();
    }, [session, load]),
  );

  if (!session) return <Redirect href="/sign-in" />;
  const active = mediaTypes.find((m) => m.key === activeType)!;
  const activeStatus = statusByType[activeType];
  const q = query.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      i.media_type === activeType &&
      i.status === activeStatus &&
      (!q || i.title.toLowerCase().includes(q) || (i.creator ?? '').toLowerCase().includes(q)),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Logo size={40} />
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.settingsButton}
          >
            <Feather name="settings" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Books / Movies / Series tabs */}
        <View style={styles.tabBar} accessibilityRole="tablist">
          {mediaTypes.map((m) => {
            const isActive = m.key === activeType;
            return (
              <Pressable
                key={m.key}
                onPress={() => setActiveType(m.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={styles.tab}
              >
                <View style={styles.tabContent}>
                  <Feather
                    name={m.icon}
                    size={16}
                    color={isActive ? colors.accentText : colors.textSecondary}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{m.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Heading on the left, Want to / In progress / Done on the right */}
        <View style={styles.headingRow}>
          <Text style={styles.heading} accessibilityRole="header">
            {active.label}
          </Text>

          <View style={styles.statusRow}>
            {itemStatuses.map((s) => {
              const isActive = s.key === activeStatus;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => setStatusByType((prev) => ({ ...prev, [activeType]: s.key }))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Show ${s.label.toLowerCase()}`}
                  style={styles.status}
                >
                  <Text style={[styles.statusLabel, isActive && styles.statusLabelActive]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Search by title (or author / director / creator) */}
        <View style={styles.search}>
          <Feather
            name="search"
            size={17}
            color={colors.textSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${active.label.toLowerCase()}`}
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel={`Search ${active.label.toLowerCase()} by title`}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="never"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.clearButton}
              hitSlop={6}
            >
              <Feather name="x" size={17} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {loading && items.length === 0 ? (
          <ActivityIndicator color={colors.textSecondary} style={styles.loader} />
        ) : loadError && items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{loadError}</Text>
            <Pressable onPress={load} accessibilityRole="button" style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ItemCard item={item} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              q ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No matches</Text>
                  <Text style={styles.emptyText}>Nothing here matches “{query.trim()}”.</Text>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>Nothing here yet</Text>
                  <Text style={styles.emptyText}>{emptyMessages[activeType][activeStatus]}</Text>
                </View>
              )
            }
          />
        )}

        {/* The "+" button */}
        <Pressable
          onPress={() =>
            router.push({ pathname: '/add', params: { type: activeType, status: activeStatus } })
          }
          accessibilityRole="button"
          accessibilityLabel={`Add a ${active.singular.toLowerCase()}`}
          style={({ pressed }) => [
            styles.addButton,
            { bottom: insets.bottom + spacing.md },
            pressed && styles.pressed,
          ]}
        >
          <Feather name="plus" size={30} color={colors.onAccentIcon} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ItemCard({ item }: { item: LibraryItem }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const details = [item.creator, item.year].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
      accessibilityRole="button"
      accessibilityHint="Opens details and notes"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Cover title={item.title} type={item.media_type} imageUrl={item.cover_image_url} />
      <View style={styles.cardText}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {details ? (
          <Text style={styles.cardDetails} numberOfLines={1}>
            {details}
          </Text>
        ) : null}
        {item.status === 'finished' && item.rating ? (
          <View style={styles.cardStars}>
            <StarRating value={item.rating} size={14} color={colors.accent} emptyColor={colors.muted} />
          </View>
        ) : null}
      </View>
      <Feather
        name="chevron-right"
        size={18}
        color={colors.muted}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors, scheme: ColorScheme) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 700, // keeps it tidy on iPad
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  settingsButton: {
    minHeight: minTapSize,
    minWidth: minTapSize,
    alignItems: 'flex-end', // icon's right edge lines up with "Done" and the tab line
    justifyContent: 'center',
    paddingRight: spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    // Line runs from the logo's "C" (Bagel Fat One leaves ~1pt before it at 40pt)
    // to the right edge of the settings icon (which has spacing.sm padding).
    marginLeft: 1,
    marginRight: spacing.sm,
  },
  tab: {
    flex: 1,
    minHeight: minTapSize + 4,
    justifyContent: 'flex-end',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingBottom: spacing.sm + 2,
  },
  tabLabel: {
    fontSize: 16,
    color: c.textSecondary,
    fontFamily: fonts.bodyMedium,
  },
  tabLabelActive: {
    color: c.accentText,
    fontFamily: fonts.bodyBold,
  },
  headingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap', // on very narrow phones the words drop below the heading
    alignItems: 'baseline', // the words rest on the same line as the heading letters
    justifyContent: 'space-between',
    columnGap: spacing.md,
    rowGap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: c.heading,
  },
  statusRow: {
    flexGrow: 1, // stretch from the heading to the right edge
    minWidth: 220, // below this it drops under the heading instead of squashing
    flexDirection: 'row',
    justifyContent: 'space-between',
    // "Done" ends where the settings icon ends (it has spacing.sm padding).
    marginRight: spacing.sm,
  },
  status: {
    minHeight: minTapSize,
    justifyContent: 'flex-end',
    paddingBottom: spacing.xs + 2,
  },
  statusLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: c.textSecondary,
  },
  statusLabelActive: {
    fontFamily: fonts.bodyBold,
    color: c.accentText,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: minTapSize,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    marginRight: spacing.sm, // ends with the settings icon, "Done" and the tab line
    marginBottom: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.divider,
  },
  searchInput: {
    flex: 1,
    minHeight: minTapSize,
    fontFamily: fonts.body,
    fontSize: 16,
    color: c.text,
  },
  clearButton: {
    minWidth: minTapSize - 8,
    minHeight: minTapSize - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: c.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loader: { marginTop: spacing.xl },
  retry: { minHeight: minTapSize, justifyContent: 'center', marginTop: spacing.sm },
  retryText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: c.accentText,
    textDecorationLine: 'underline',
  },
  separator: { height: spacing.sm + 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    ...cardShadow(scheme, c),
  },
  cardText: { flex: 1 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.onSurface, lineHeight: 21 },
  cardDetails: { fontFamily: fonts.body, fontSize: 14, color: c.muted, marginTop: 2 },
  cardStars: { marginTop: spacing.xs + 2 },
  addButton: {
    position: 'absolute',
    right: spacing.md,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow(scheme, c),
  },
  pressed: { opacity: 0.8 },
});
