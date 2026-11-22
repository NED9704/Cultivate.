import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { minTapSize } from '../../constants/theme';

type Props = {
  value: number | null;
  /** Leave out to show the stars without letting people tap them. */
  onChange?: (value: number | null) => void;
  size?: number;
  color: string;
  emptyColor: string;
};

/** 1–5 stars: filled when highlighted, outlined when not. Tapping the current rating again clears it. */
export function StarRating({ value, onChange, size = 16, color, emptyColor }: Props) {
  const rating = value ?? 0;

  if (!onChange) {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityLabel={rating ? `Rated ${rating} out of 5` : 'Not rated'}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Ionicons
            key={n}
            name={n <= rating ? 'star' : 'star-outline'}
            size={size}
            color={n <= rating ? color : emptyColor}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityLabel="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n === rating ? null : n)}
          accessibilityRole="button"
          accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
          accessibilityState={{ selected: n <= rating }}
          style={styles.tapTarget}
          hitSlop={4}
        >
          <Ionicons
            name={n <= rating ? 'star' : 'star-outline'}
            size={size}
            color={n <= rating ? color : emptyColor}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tapTarget: { minWidth: minTapSize, minHeight: minTapSize, alignItems: 'center', justifyContent: 'center' },
});
