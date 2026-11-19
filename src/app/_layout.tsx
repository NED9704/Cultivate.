import { BagelFatOne_400Regular, useFonts } from '@expo-google-fonts/bagel-fat-one';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { colors } from '../../constants/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BagelFatOne_400Regular });

  if (!fontsLoaded) {
    // Plain brown screen for the split second while the font loads.
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
