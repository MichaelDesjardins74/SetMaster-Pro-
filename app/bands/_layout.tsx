import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function BandsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackVisible: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerBackTitleVisible: true,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="new"
        options={{
          presentation: 'modal',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="invitation/[id]"
        options={{ headerShown: true }}
      />
    </Stack>
  );
}
