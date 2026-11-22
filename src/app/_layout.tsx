// Import each font weight from its own file so only these four are bundled.
import { BagelFatOne_400Regular } from '@expo-google-fonts/bagel-fat-one/400Regular';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { fonts, spacing, type ThemeColors } from '../../constants/theme';
import { AuthProvider, useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { ThemeProvider, useTheme, useThemedStyles } from '../lib/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const { scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [fontsLoaded] = useFonts({
    BagelFatOne_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded) {
    // Plain background for the split second while the fonts load.
    return <View style={styles.center} />;
  }

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.center}>
        <Text style={styles.setupTitle}>Almost ready</Text>
        <Text style={styles.setupText}>
          Add your Supabase URL and publishable key to the .env file, then restart the dev server.
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      {/* Light clock/battery icons on the dark background, dark ones on the light background */}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  // Screens send you to the right place themselves:
  // the Library redirects to sign-in when signed out, and sign-in redirects
  // to the Library once signed in. Privacy and Terms are always reachable.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="item/[id]" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
    </Stack>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    center: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    setupTitle: {
      fontFamily: fonts.display,
      fontSize: 32,
      color: c.text,
      marginBottom: spacing.md,
    },
    setupText: {
      fontFamily: fonts.body,
      fontSize: 16,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
