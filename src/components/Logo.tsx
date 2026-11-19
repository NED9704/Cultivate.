import { StyleSheet, Text, type TextStyle } from 'react-native';

import { fonts, type ThemeColors } from '../../constants/theme';
import { useThemedStyles } from '../lib/theme';

/** The "Cultivate." wordmark with a sienna dot. */
export function Logo({ size = 40, style }: { size?: number; style?: TextStyle }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text
      style={[styles.logo, { fontSize: size }, style]}
      accessibilityRole="header"
      accessibilityLabel="Cultivate."
    >
      Cultivate<Text style={styles.dot}>.</Text>
    </Text>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    logo: {
      fontFamily: fonts.display,
      color: c.logo,
    },
    dot: {
      color: c.accentText,
    },
  });
