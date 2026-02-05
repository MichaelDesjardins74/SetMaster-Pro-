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
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // Hide header on list view (handled by SafeAreaView)
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false, // Hide header with confusing [id] title and index back button
        }}
      />
    </Stack>
  );
}
