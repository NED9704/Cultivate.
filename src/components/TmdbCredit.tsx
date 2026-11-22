import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { fonts, spacing, type ThemeColors } from '../../constants/theme';
import { useThemedStyles } from '../lib/theme';

/** Required by TMDB's terms: keep this exact wording wherever TMDB data is shown. */
export const TMDB_NOTICE =
  'This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.';

const LOGO = require('../../assets/tmdb-logo.png');
const LOGO_ASPECT = 900 / 65; // the PNG's width ÷ height

/** TMDB logo with the required notice underneath. */
export function TmdbCredit({ logoHeight = 10, style }: { logoHeight?: number; style?: ViewStyle }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={LOGO}
        style={{ height: logoHeight, width: Math.round(logoHeight * LOGO_ASPECT) }}
        resizeMode="contain"
        accessibilityLabel="TMDB"
      />
      <Text style={styles.notice}>{TMDB_NOTICE}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { gap: spacing.xs + 2 },
    notice: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: c.textSecondary },
  });
