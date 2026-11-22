import Feather from '@expo/vector-icons/Feather';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
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
import { StarRating } from '../components/StarRating';
import { useAuth } from '../lib/auth';
import { addItem } from '../lib/items';
import { useTheme, useThemedStyles } from '../lib/theme';

const isMediaType = (v: unknown): v is MediaType => v === 'book' || v === 'movie' || v === 'series';
const isStatus = (v: unknown): v is ItemStatus =>
  v === 'want_to' || v === 'in_progress' || v === 'finished';

const MAX_YEAR = new Date().getFullYear() + 5;

export default function AddItemScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // The Library passes the tab and filter you were on, so they're preselected.
  const params = useLocalSearchParams<{ type?: string; status?: string }>();

  const [type, setType] = useState<MediaType>(isMediaType(params.type) ? params.type : 'book');
  const [status, setStatus] = useState<ItemStatus>(isStatus(params.status) ? params.status : 'want_to');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [year, setYear] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creatorRef = useRef<ComponentRef<typeof TextInput>>(null);
  const yearRef = useRef<ComponentRef<typeof TextInput>>(null);

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
      await addItem({ title, media_type: type, status, creator, year: yearNumber, rating });
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
            Add to your shelf
          </Text>

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
            onChangeText={setTitle}
            autoFocus
            placeholder={type === 'book' ? 'Norwegian Wood' : type === 'movie' ? 'Spirited Away' : 'Fleabag'}
            placeholderTextColor={colors.muted}
            accessibilityLabel="Title"
            returnKeyType="next"
            onSubmitEditing={() => creatorRef.current?.focus()}
            submitBehavior="submit"
            maxLength={300}
            style={styles.input}
          />

          {/* 3. Optional details */}
          <Text style={styles.label}>
            {typeInfo.creatorLabel} <Text style={styles.optional}>(optional)</Text>
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
