import Feather from '@expo/vector-icons/Feather';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  type ThemeColors,
} from '../../../constants/theme';
import { Cover } from '../../components/Cover';
import { StarRating } from '../../components/StarRating';
import { TmdbCredit } from '../../components/TmdbCredit';
import { useAuth } from '../../lib/auth';
import {
  deleteItem,
  fetchItem,
  statusChangeFields,
  updateItem,
  type ItemDetail,
  type ItemPatch,
} from '../../lib/items';
import { useTheme, useThemedStyles } from '../../lib/theme';

type NotesState = 'idle' | 'saving' | 'saved' | 'error';

const NOTES_SAVE_DELAY_MS = 800;

export default function ItemDetailScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [notesState, setNotesState] = useState<NotesState>('idle');
  const [deleting, setDeleting] = useState(false);
  // The notes text last saved to the server (null until first loaded), to know
  // whether there are unsaved changes. latestNotes always holds what's on screen.
  const savedNotes = useRef<string | null>(null);
  const latestNotes = useRef(notes);
  latestNotes.current = notes;

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const fresh = await fetchItem(id);
      setItem(fresh);
      setLoadError(null);
      const serverNotes = fresh.notes ?? '';
      // Show the saved notes on first load, or on reload when nothing is unsaved.
      // (Decided here, not inside a state updater, so the order can't go wrong.)
      const firstLoad = savedNotes.current === null;
      const hasUnsaved = !firstLoad && latestNotes.current !== savedNotes.current;
      if (!hasUnsaved) {
        savedNotes.current = serverNotes;
        latestNotes.current = serverNotes;
        setNotes(serverNotes);
      }
    } catch {
      setLoadError('Couldn’t load this item. Check your connection and try again.');
    }
  }, [id]);

  // Load on open, and again when coming back from Edit.
  useFocusEffect(
    useCallback(() => {
      if (session) load();
    }, [session, load]),
  );

  // Save notes automatically a moment after you stop typing.
  useEffect(() => {
    if (!id || savedNotes.current === null) return;
    if (notes === savedNotes.current) {
      // Typed back to what's already saved: nothing to do.
      setNotesState((s) => (s === 'saving' ? 'saved' : s));
      return;
    }
    setNotesState('saving');
    const timer = setTimeout(async () => {
      try {
        await updateItem(id, { notes: notes || null });
        savedNotes.current = notes;
        setNotesState('saved');
      } catch {
        setNotesState('error');
      }
    }, NOTES_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [id, notes]);

  // If you leave while a notes save is waiting, save it right away.
  useEffect(() => {
    return () => {
      if (id && savedNotes.current !== null && latestNotes.current !== savedNotes.current) {
        updateItem(id, { notes: latestNotes.current || null }).catch(() => {});
      }
    };
  }, [id]);

  if (!session) return <Redirect href="/sign-in" />;

  /** Change something right away, and undo it on screen if saving fails. */
  async function applyChange(patch: ItemPatch) {
    if (!item || !id) return;
    const before = item;
    setActionError(null);
    setItem({ ...item, ...patch } as ItemDetail);
    try {
      await updateItem(id, patch);
    } catch {
      setItem(before);
      setActionError('Couldn’t save that change. Check your connection and try again.');
    }
  }

  function changeStatus(status: ItemStatus) {
    if (!item || status === item.status) return;
    applyChange(statusChangeFields(status));
  }

  function confirmDelete() {
    if (!item || !id) return;
    Alert.alert(
      `Delete “${item.title}”?`,
      'This removes it from your shelf for good, including your notes. You can’t undo this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              savedNotes.current = latestNotes.current; // nothing left to save
              await deleteItem(id);
              router.back();
            } catch {
              setDeleting(false);
              setActionError('Couldn’t delete it. Check your connection and try again.');
            }
          },
        },
      ],
    );
  }

  const typeInfo = item ? mediaTypes.find((m) => m.key === item.media_type)! : null;
  const details = item ? [item.creator, item.year].filter(Boolean).join(' · ') : '';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.topButton}>
          <Text style={styles.topButtonText}>‹ Back</Text>
        </Pressable>
        {item && (
          <Pressable
            onPress={() => router.push({ pathname: '/add', params: { id: item.id } })}
            accessibilityRole="button"
            style={styles.topButton}
          >
            <Text style={styles.topButtonText}>Edit</Text>
          </Pressable>
        )}
      </View>

      {!item ? (
        <View style={styles.center}>
          {loadError ? (
            <>
              <Text style={styles.message}>{loadError}</Text>
              <Pressable onPress={load} accessibilityRole="button" style={styles.topButton}>
                <Text style={styles.linkText}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color={colors.textSecondary} />
          )}
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Cover, title and details */}
            <View style={styles.header}>
              <Cover title={item.title} type={item.media_type} imageUrl={item.cover_image_url} width={96} />
              <View style={styles.headerText}>
                <Text style={styles.title} accessibilityRole="header">
                  {item.title}
                </Text>
                {details ? <Text style={styles.details}>{details}</Text> : null}
                {typeInfo && (
                  <View style={styles.typeRow}>
                    <Feather
                      name={typeInfo.icon}
                      size={14}
                      color={colors.textSecondary}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <Text style={styles.typeText}>{typeInfo.singular}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* One-tap status */}
            <Text style={styles.label}>Status</Text>
            <View style={styles.optionRow}>
              {itemStatuses.map((s) => {
                const selected = s.key === item.status;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => changeStatus(s.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {item.status === 'finished' && (
              <>
                <Text style={styles.label}>Your rating</Text>
                <StarRating
                  value={item.rating}
                  onChange={(rating) => applyChange({ rating })}
                  size={30}
                  color={colors.accentText}
                  emptyColor={colors.divider}
                />
              </>
            )}

            {actionError && (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {actionError}
              </Text>
            )}

            {/* Private notes */}
            <View style={styles.notesHeader}>
              <Text style={styles.label}>Notes</Text>
              <Text style={styles.notesStatus} accessibilityLiveRegion="polite">
                {notesState === 'saving'
                  ? 'Saving…'
                  : notesState === 'saved'
                    ? 'Saved'
                    : notesState === 'error'
                      ? 'Not saved — check your connection'
                      : ''}
              </Text>
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
              placeholder="What did you love? Favourite quotes, who recommended it…"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Notes, only visible to you"
              maxLength={20000}
              style={styles.notes}
            />
            <View style={styles.privateRow}>
              <Feather
                name="lock"
                size={13}
                color={colors.textSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.privateText}>Only you can see your notes.</Text>
            </View>

            {/* Credit for details looked up from TMDB (required by TMDB) */}
            {item.source === 'tmdb' && <TmdbCredit style={styles.credit} />}

            {/* Delete */}
            <Pressable
              onPress={confirmDelete}
              disabled={deleting}
              accessibilityRole="button"
              style={styles.deleteButton}
            >
              {deleting ? (
                <ActivityIndicator color={colors.divider} />
              ) : (
                <Text style={styles.deleteText}>Delete from my shelf</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: c.background },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
    },
    topButton: { minHeight: minTapSize, justifyContent: 'center', paddingHorizontal: spacing.sm },
    topButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 17, color: c.text },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    message: {
      fontFamily: fonts.body,
      fontSize: 16,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    linkText: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: c.accentText,
      textDecorationLine: 'underline',
    },
    content: {
      width: '100%',
      maxWidth: 700,
      alignSelf: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl * 2,
    },
    header: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, alignItems: 'flex-start' },
    headerText: { flex: 1, paddingTop: spacing.xs },
    title: { fontFamily: fonts.bodyBold, fontSize: 24, lineHeight: 30, color: c.text },
    details: { fontFamily: fonts.body, fontSize: 16, color: c.textSecondary, marginTop: spacing.xs },
    typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.sm },
    typeText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.textSecondary },
    label: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: c.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.xs + 2,
    },
    optionRow: { flexDirection: 'row', gap: spacing.sm },
    option: {
      flex: 1,
      minHeight: minTapSize + 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.divider,
      paddingHorizontal: spacing.xs,
    },
    optionSelected: { borderColor: c.accentText, borderWidth: 1.5 },
    optionText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: c.textSecondary },
    optionTextSelected: { fontFamily: fonts.bodyBold, color: c.accentText },
    error: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: c.errorText, marginTop: spacing.md },
    notesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    notesStatus: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: spacing.xs + 2,
    },
    notes: {
      minHeight: 200,
      borderRadius: radius.sm,
      padding: spacing.md,
      paddingTop: spacing.md,
      backgroundColor: c.surface,
      color: c.onSurface,
      fontFamily: fonts.body,
      fontSize: 16,
      lineHeight: 23,
    },
    credit: { marginTop: spacing.lg },
    privateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.sm },
    privateText: { fontFamily: fonts.body, fontSize: 13, color: c.textSecondary },
    deleteButton: {
      marginTop: spacing.xl,
      minHeight: minTapSize + 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.divider,
    },
    deleteText: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.divider },
  });
