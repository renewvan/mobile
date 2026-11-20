import { Stack } from 'expo-router'
import { useAppHeaderOptions } from '@/components/AppHeader'
import { useTheme } from '@/theme'

/**
 * A tab's own stack. Its first page wears the app header (logo left, bell right); a page pushed
 * onto it sets its own header with a back arrow (Settings screens do, through `SettingsScreen`).
 */
export function TabStack() {
  const { colors } = useTheme()
  const header = useAppHeaderOptions()
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="index" options={header} />
    </Stack>
  )
}
