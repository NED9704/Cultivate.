import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts, minTapSize, spacing, type ThemeColors } from '../../constants/theme';
import { useThemedStyles } from '../lib/theme';

/** Simple placeholder page. Replace the text with the real policy before launch. */
export function LegalPage({ title, body }: { title: string; body: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView style={styles.screen}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        style={styles.back}
      >
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    back: { minHeight: minTapSize, justifyContent: 'center', paddingHorizontal: spacing.md },
    backText: { fontSize: 17, color: c.text, fontFamily: fonts.bodySemiBold },
    content: { padding: spacing.md, maxWidth: 700, width: '100%', alignSelf: 'center' },
    title: {
      fontSize: 28,
      fontFamily: fonts.bodyBold,
      color: c.text,
      marginBottom: spacing.md,
    },
    body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: c.textSecondary },
  });
