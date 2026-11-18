import '../global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { HeroUINativeProvider } from 'heroui-native'
import { useEffect } from 'react'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AlertsProvider } from '@/alerts/AlertsProvider'
import { ConfirmHost } from '@/components/native'
import { useAppHeaderOptions } from '@/components/AppHeader'
import { RenewvanBusProvider } from '@/bus/RenewvanBusProvider'
import { PreferencesProvider } from '@/preferences/PreferencesProvider'
import { SessionProvider, useSession } from '@/session/SessionProvider'
import { useTheme } from '@/theme'

/**
 * The app's root: which van this phone is signed in to (`SessionProvider`), the one bus connection
 * that follows from it (`RenewvanBusProvider`), the phone's own preferences, and the places a
 * person can be: the tabs with Settings stacked over them, or the sign-in screen. Protected routes do the switching, so signing out from anywhere lands on
 * sign-in and a deep link into a tab cannot skip it.
 */
export default function RootLayout() {
  // HeroUI Native draws the form controls (`src/components/native`), themed by `src/global.css`.
  // Its toasts report a heater command the heater never confirmed, as the dashboard does; every
  // other outcome is read from the bus.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <PreferencesProvider>
          <SessionProvider>
            <Root />
            <ConfirmHost />
          </SessionProvider>
        </PreferencesProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  )
}

function Root() {
  const session = useSession()
  const { colors, isDark } = useTheme()
  const headerOptions = useAppHeaderOptions()

  // The window behind the screens (seen during transitions and under the keyboard).
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background)
  }, [colors.background])

  // Until the stored van has been read there is nowhere right to go; the splash colour stays up.
  if (session.status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />
  }

  const signedIn = session.status === 'ready'
  return (
    <RenewvanBusProvider config={session.connection?.config ?? null}>
      <AlertsProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" options={headerOptions} />
            <Stack.Screen name="alerts" />
            <Stack.Screen name="settings/index" />
            <Stack.Screen name="settings/[view]" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
          </Stack.Protected>
        </Stack>
      </AlertsProvider>
    </RenewvanBusProvider>
  )
}
