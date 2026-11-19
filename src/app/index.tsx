import Feather from '@expo/vector-icons/Feather';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fonts,
  itemStatuses,
  mediaTypes,
  minTapSize,
  spacing,
  type ItemStatus,
  type MediaType,
  type ThemeColors,
} from '../../constants/theme';
import { Logo } from '../components/Logo';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
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
  const { colors, scheme, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [activeType, setActiveType] = useState<MediaType>('book');
  // Each tab remembers its own status filter.
  const [statusByType, setStatusByType] = useState<Record<MediaType, ItemStatus>>({
    book: 'want_to',
    movie: 'want_to',
    series: 'want_to',
  });

  if (!session) return <Redirect href="/sign-in" />;
  const active = mediaTypes.find((m) => m.key === activeType)!;
  const activeStatus = statusByType[activeType];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Logo size={40} />
          {/* Temporary — these move to the Settings screen later */}
          <View style={styles.topActions}>
            <Pressable
              onPress={() => setPreference(scheme === 'dark' ? 'light' : 'dark')}
              accessibilityRole="button"
              accessibilityLabel={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={styles.iconButton}
            >
              <Feather name={scheme === 'dark' ? 'sun' : 'moon'} size={20} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => supabase.auth.signOut()}
              accessibilityRole="button"
              style={styles.signOut}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
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

        {/* Empty state message */}
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyText}>{emptyMessages[activeType][activeStatus]}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
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
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    minHeight: minTapSize,
    minWidth: minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOut: {
    minHeight: minTapSize,
    minWidth: minTapSize,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  signOutText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: c.textSecondary,
    textDecorationLine: 'underline',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    // Line runs from the logo's "C" (Bagel Fat One leaves ~1pt before it at 40pt)
    // to the end of the "Sign out" text (which has spacing.sm padding).
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
    alignItems: 'flex-end',
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
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    // "Done" and the line end where the "Sign out" text ends (it has spacing.sm padding).
    marginRight: spacing.sm,
    // Lift the line to the bottom of the heading letters: Bagel Fat One leaves
    // ~8.6pt below its letters at 30pt (descender 288/1000 em).
    marginBottom: 9,
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
});
