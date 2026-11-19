import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  fonts,
  mediaTypes,
  minTapSize,
  radius,
  shadow,
  spacing,
  type MediaType,
} from '../../constants/theme';

const emptyMessages: Record<MediaType, string> = {
  book: 'Your shelf is empty — add the last thing you read.',
  movie: 'No movies yet — add the last one you watched.',
  series: 'No series yet — add the last show you binged.',
};

export default function LibraryScreen() {
  const [activeType, setActiveType] = useState<MediaType>('book');
  const active = mediaTypes.find((m) => m.key === activeType)!;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <Text style={styles.logo} accessibilityRole="header">
          Cultivate.
        </Text>

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
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <Text style={styles.tabIcon}>{m.icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.headingRow}>
          <View style={[styles.typeDot, { backgroundColor: active.color }]} />
          <Text style={styles.heading}>
            {active.icon} {active.label}
          </Text>
        </View>

        {/* Empty state placeholder */}
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyText}>{emptyMessages[activeType]}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 700, // keeps it tidy on iPad
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: spacing.xs,
    ...shadow,
  },
  tab: {
    flex: 1,
    minHeight: minTapSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.muted,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.onAccent,
    fontWeight: '700',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  typeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.text,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadow,
  },
  emptyTitle: {
    fontFamily: fonts.body,
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
