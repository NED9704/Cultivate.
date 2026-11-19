import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
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
  cardShadow,
  fonts,
  minTapSize,
  radius,
  spacing,
  type ColorScheme,
  type ThemeColors,
} from '../../constants/theme';
import { Logo } from '../components/Logo';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useTheme, useThemedStyles } from '../lib/theme';

type Mode = 'sign-in' | 'sign-up';

const MIN_PASSWORD = 8;

export default function SignInScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<Mode>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';

  // Already signed in (or just signed in): go to the Library.
  if (session) return <Redirect href="/" />;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit() {
    setError(null);
    setNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < (isSignUp ? MIN_PASSWORD : 1)) {
      setError(isSignUp ? `Password needs at least ${MIN_PASSWORD} characters.` : 'Please enter your password.');
      return;
    }

    setBusy(true);
    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (signUpError) {
        setError(friendlyError(signUpError.message));
      } else if (!data.session) {
        // Email confirmation is on: the user must tap the link in their inbox first.
        setNotice('Almost there! Check your email and tap the confirmation link, then sign in here.');
        setMode('sign-in');
        setPassword('');
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (signInError) setError(friendlyError(signInError.message));
    }
    setBusy(false);
    // On success the layout notices the new session and opens the Library.
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Logo size={48} style={styles.logo} />
            <Text style={styles.tagline}>Your cosy shelf of books, movies and series.</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>

              {isSignUp && (
                <Field
                  label="Your name (optional)"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoComplete="name"
                  textContentType="name"
                  autoCapitalize="words"
                />
              )}
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                label={isSignUp ? `Password (at least ${MIN_PASSWORD} characters)` : 'Password'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                textContentType={isSignUp ? 'newPassword' : 'password'}
                autoCapitalize="none"
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
              />

              {error && (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {error}
                </Text>
              )}
              {notice && (
                <Text style={styles.notice} accessibilityLiveRegion="polite">
                  {notice}
                </Text>
              )}

              <Pressable
                onPress={handleSubmit}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={styles.primaryButtonText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
                )}
              </Pressable>

              {isSignUp && (
                <Text style={styles.legal}>
                  By creating an account you agree to our{' '}
                  <Link href="/terms" style={styles.legalLink}>
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" style={styles.legalLink}>
                    Privacy Policy
                  </Link>
                  .
                </Text>
              )}
            </View>

            <Pressable
              onPress={() => switchMode(isSignUp ? 'sign-in' : 'sign-up')}
              accessibilityRole="button"
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {isSignUp ? 'Already have an account? ' : 'New here? '}
                <Text style={styles.switchTextBold}>{isSignUp ? 'Sign in' : 'Create an account'}</Text>
              </Text>
            </Pressable>

            <View style={styles.footerLinks}>
              <Link href="/privacy" style={styles.footerLink}>
                Privacy Policy
              </Link>
              <Text style={styles.footerDot}>·</Text>
              <Link href="/terms" style={styles.footerLink}>
                Terms
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, ...inputProps }: { label: string } & React.ComponentProps<typeof TextInput>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCorrect={false}
      />
    </View>
  );
}

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'That email and password don’t match. Please try again.';
  if (m.includes('already registered')) return 'An account with this email already exists. Try signing in.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the link.';
  if (m.includes('network') || m.includes('fetch')) return 'Can’t reach the server. Check your internet connection.';
  if (m.includes('rate limit')) return 'Too many tries. Please wait a minute and try again.';
  return message;
}

const makeStyles = (c: ThemeColors, scheme: ColorScheme) =>
  StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: c.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
  },
  logo: {
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: c.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...cardShadow(scheme, c),
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: fonts.bodyBold,
    color: c.onSurface,
    marginBottom: spacing.md,
  },
  field: { marginBottom: spacing.md },
  label: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: c.muted,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: minTapSize + 4,
    borderWidth: 1.5,
    borderColor: c.muted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: 17,
    color: c.onSurface,
    backgroundColor: c.inputBackground,
  },
  error: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    color: c.error,
    marginBottom: spacing.md,
  },
  notice: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: c.onSurface,
    marginBottom: spacing.md,
  },
  primaryButton: {
    minHeight: minTapSize + 8,
    borderRadius: radius.pill,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: fonts.bodyBold,
    color: c.onAccent,
  },
  legal: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: c.muted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
  legalLink: {
    fontFamily: fonts.bodyBold,
    color: c.onSurface,
    textDecorationLine: 'underline',
  },
  switchButton: {
    minHeight: minTapSize,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  switchText: { fontFamily: fonts.body, fontSize: 16, color: c.textSecondary },
  switchTextBold: { fontFamily: fonts.bodyBold, color: c.text },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  footerLink: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: c.textSecondary,
    textDecorationLine: 'underline',
    padding: spacing.sm,
  },
  footerDot: { color: c.textSecondary },
});
