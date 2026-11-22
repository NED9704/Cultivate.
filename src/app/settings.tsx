import Feather from '@expo/vector-icons/Feather';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { fonts, minTapSize, radius, spacing, type ThemeColors } from '../../constants/theme';
import { deleteMyAccount, fetchMyProfile, updateDisplayName } from '../lib/account';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useTheme, useThemedStyles, type ThemePreference } from '../lib/theme';

const appearanceOptions: { key: ThemePreference; label: string; icon: 'sun' | 'moon' }[] = [
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];

export default function SettingsScreen() {
  const { session } = useAuth();
  const { colors, preference, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const userId = session?.user.id;

  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState<string | null>(null);
  const [nameState, setNameState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchMyProfile(userId)
      .then((p) => {
        setName(p.display_name ?? '');
        setSavedName(p.display_name ?? '');
      })
      .catch(() => setSavedName('')); // still lets you set a name
  }, [userId]);

  if (!session || !userId) return <Redirect href="/sign-in" />;

  const nameChanged = savedName !== null && name.trim() !== savedName.trim();

  async function saveName() {
    if (!userId || !nameChanged) return;
    setNameState('saving');
    try {
      await updateDisplayName(userId, name);
      setSavedName(name.trim());
      setName(name.trim());
      setNameState('saved');
    } catch {
      setNameState('error');
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and everything on your shelf, including all your notes. You can’t undo this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'Your account and all your data will be gone for good.', [
              { text: 'Keep my account', style: 'cancel' },
              { text: 'Delete forever', style: 'destructive', onPress: runDelete },
            ]),
        },
      ],
    );
  }

  async function runDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyAccount();
      // Signed out now: the app sends you back to the sign-in screen.
      router.replace('/sign-in');
    } catch {
      setDeleting(false);
      setDeleteError('Couldn’t delete your account. Check your connection and try again.');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.topButton}>
          <Text style={styles.topButtonText}>‹ Back</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading} accessibilityRole="header">
            Settings
          </Text>

          {/* Name */}
          <Text style={styles.label}>Your name</Text>
          <View style={styles.nameRow}>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameState('idle');
              }}
              placeholder="How you’d like to be called"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Your name"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="done"
              onSubmitEditing={saveName}
              maxLength={50}
              style={styles.input}
            />
            {nameChanged && (
              <Pressable
                onPress={saveName}
                disabled={nameState === 'saving'}
                accessibilityRole="button"
                style={styles.smallButton}
              >
                {nameState === 'saving' ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={styles.smallButtonText}>Save</Text>
                )}
              </Pressable>
            )}
          </View>
          {nameState === 'saved' && <Text style={styles.hint}>Saved</Text>}
          {nameState === 'error' && (
            <Text style={styles.error}>Couldn’t save your name. Check your connection and try again.</Text>
          )}
          <Text style={styles.hint}>Signed in as {session.user.email}</Text>

          {/* Appearance */}
          <Text style={styles.label}>Appearance</Text>
          <View style={styles.optionRow}>
            {appearanceOptions.map((o) => {
              const selected = o.key === preference;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setPreference(o.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Feather
                    name={o.icon}
                    size={16}
                    color={selected ? colors.accentText : colors.textSecondary}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Legal */}
          <Text style={styles.label}>About</Text>
          <View style={styles.list}>
            <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" style={styles.row}>
              <Text style={styles.rowText}>Privacy Policy</Text>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable onPress={() => router.push('/terms')} accessibilityRole="link" style={styles.row}>
              <Text style={styles.rowText}>Terms of Use</Text>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Sign out */}
          <Pressable
            onPress={() => supabase.auth.signOut()}
            accessibilityRole="button"
            style={[styles.outlineButton, styles.signOutButton]}
          >
            <Text style={styles.outlineButtonText}>Sign out</Text>
          </Pressable>

          {/* Delete account */}
          <Pressable
            onPress={confirmDeleteAccount}
            disabled={deleting}
            accessibilityRole="button"
            style={[styles.outlineButton, styles.deleteButton]}
          >
            {deleting ? (
              <ActivityIndicator color={colors.errorText} />
            ) : (
              <Text style={styles.deleteText}>Delete my account</Text>
            )}
          </Pressable>
          <Text style={styles.hint}>
            Permanently deletes your account and everything on your shelf, including your notes.
          </Text>
          {deleteError && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {deleteError}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: c.background },
    topBar: { flexDirection: 'row', paddingHorizontal: spacing.sm },
    topButton: { minHeight: minTapSize, justifyContent: 'center', paddingHorizontal: spacing.sm },
    topButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 17, color: c.text },
    content: {
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl * 2,
    },
    heading: {
      fontFamily: fonts.display,
      fontSize: 30,
      color: c.heading,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    label: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: c.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.xs + 2,
    },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    input: {
      flex: 1,
      minHeight: minTapSize + 6,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: c.surface,
      color: c.onSurface,
      fontFamily: fonts.body,
      fontSize: 17,
    },
    smallButton: {
      minHeight: minTapSize + 6,
      minWidth: 72,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    smallButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.onAccent },
    hint: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: c.textSecondary,
      marginTop: spacing.sm,
      lineHeight: 18,
    },
    error: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: c.errorText, marginTop: spacing.sm },
    optionRow: { flexDirection: 'row', gap: spacing.sm },
    option: {
      flex: 1,
      minHeight: minTapSize + 4,
      flexDirection: 'row',
      gap: spacing.xs + 2,
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
    list: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.divider },
    row: {
      minHeight: minTapSize + 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowDivider: { height: 1, backgroundColor: c.divider },
    rowText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: c.text },
    outlineButton: {
      minHeight: minTapSize + 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    signOutButton: { marginTop: spacing.xl, borderColor: c.divider },
    outlineButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.text },
    deleteButton: { marginTop: spacing.lg, borderColor: c.errorText },
    deleteText: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.errorText },
  });
