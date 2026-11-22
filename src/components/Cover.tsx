import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { coverColors, fonts, mediaTypes, type MediaType } from '../../constants/theme';
import { initials } from '../lib/items';
import { useTheme } from '../lib/theme';

type Props = {
  title: string;
  type: MediaType;
  imageUrl?: string | null;
  width?: number;
};

/** Cover picture, or a coloured placeholder with initials and the type's icon
 *  (also used if the picture can't be loaded). */
export function Cover({ title, type, imageUrl, width = 52 }: Props) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);

  const height = Math.round(width * 1.45);
  const box = { width, height, borderRadius: 8 };

  if (imageUrl && !failed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[box, { backgroundColor: colors.divider }]}
        resizeMode="cover"
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  const { bg, text } = coverColors(type, colors);
  const icon = mediaTypes.find((m) => m.key === type)!.icon;
  return (
    <View
      style={[box, styles.placeholder, { backgroundColor: bg }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.initials, { color: text, fontSize: Math.round(width * 0.34) }]}>
        {initials(title)}
      </Text>
      <Feather name={icon} size={Math.round(width * 0.22)} color={text} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  initials: { fontFamily: fonts.bodyBold },
});
