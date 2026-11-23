import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts, minTapSize, spacing, type ThemeColors } from '../../constants/theme';
import type { LegalDocument } from '../lib/legal';
import { useThemedStyles } from '../lib/theme';

/** Shows the Privacy Policy or Terms (text from content/legal.json). */
export function LegalPage({ doc }: { doc: LegalDocument }) {
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
          {doc.title}
        </Text>
        <Text style={styles.paragraph}>{doc.intro}</Text>

        {doc.sections.map((section) => (
          <View key={section.heading}>
            <Text style={styles.heading} accessibilityRole="header">
              {section.heading}
            </Text>
            {section.blocks.map((block, i) =>
              'ul' in block ? (
                <View key={i} style={styles.list}>
                  {block.ul.map((item) => (
                    <View key={item} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={[styles.paragraph, styles.listText]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text key={i} style={styles.paragraph}>
                  {block.p}
                </Text>
              ),
            )}
          </View>
        ))}

        <Text style={styles.date}>Last updated: {doc.effectiveDate}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    back: { minHeight: minTapSize, justifyContent: 'center', paddingHorizontal: spacing.md },
    backText: { fontSize: 17, color: c.text, fontFamily: fonts.bodySemiBold },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xl * 2,
      maxWidth: 700,
      width: '100%',
      alignSelf: 'center',
    },
    title: {
      fontSize: 28,
      fontFamily: fonts.bodyBold,
      color: c.text,
      marginBottom: spacing.md,
    },
    heading: {
      fontSize: 18,
      fontFamily: fonts.bodyBold,
      color: c.text,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    paragraph: {
      fontFamily: fonts.body,
      fontSize: 16,
      lineHeight: 24,
      color: c.textSecondary,
      marginBottom: spacing.sm,
    },
    list: { marginBottom: spacing.sm },
    listItem: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.sm },
    bullet: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 24, color: c.textSecondary },
    listText: { flex: 1, marginBottom: spacing.xs },
    date: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.textSecondary,
      marginTop: spacing.lg,
    },
  });
