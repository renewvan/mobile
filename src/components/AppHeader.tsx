import { router } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAlerts } from '@/alerts/AlertsProvider'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { radius, useTheme } from '@/theme'
import { LogoLockup } from './Logo'

/**
 * The options that give the tabs the platform's own header, as the dashboard's: the renewvan lockup
 * on the left, and on the right the DEMO badge while the shared Demo mode is on and the way into
 * Settings. One header for all tabs, so it stays put while the tabs switch under it.
 */
export function useAppHeaderOptions() {
  const { colors } = useTheme()
  return {
    headerShown: true,
    headerTitle: '',
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.surface },
    headerLeft: () => <LogoLockup size={26} />,
    headerRight: () => <HeaderActions />,
  }
}

/** The Settings button carries a dot while an alert is open or the van is out of reach. */
function HeaderActions() {
  const { colors } = useTheme()
  const { status, demoMode } = useRenewvanBus()
  const { openCount } = useAlerts()
  const attention = openCount > 0 || status === 'disconnected'

  return (
    <View style={styles.right}>
      {demoMode ? (
        <View style={[styles.demo, { backgroundColor: colors.warning }]}>
          <Text style={[styles.demoText, { color: colors.warningForeground }]}>DEMO</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={attention ? 'Settings, needs attention' : 'Settings'}
        android_ripple={{ color: colors.default, borderless: true, radius: 22 }}
        hitSlop={8}
        onPress={() => router.push('/settings')}
        style={styles.menu}
      >
        <SymbolView
          name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
          size={22}
          tintColor={colors.foreground}
        />
        {attention ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  demo: { borderRadius: radius.lg, paddingHorizontal: 10, paddingVertical: 3 },
  demoText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  menu: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})
