import { router } from 'expo-router'
import { Settings, Wifi, WifiOff } from 'lucide-react-native'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { useTheme } from '@/theme'
import { LogoLockup } from './Logo'

/**
 * The bar above every tab, as the dashboard's header: the renewvan lockup, the DEMO badge while
 * the shared Demo mode is on, how the bus connection is doing, and the way into Settings.
 */
export function AppHeader() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { status, demoMode } = useRenewvanBus()

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + 8,
          backgroundColor: colors.surface,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <LogoLockup size={26} />
      <View style={styles.right}>
        {demoMode ? (
          <View style={[styles.demo, { backgroundColor: colors.warning }]}>
            <Text style={[styles.demoText, { color: colors.warningForeground }]}>DEMO</Text>
          </View>
        ) : null}
        <View
          accessibilityRole="text"
          accessibilityLabel={`Connection: ${status}`}
          style={styles.status}
        >
          {status === 'connected' ? (
            <Wifi size={20} color={colors.success} />
          ) : status === 'connecting' ? (
            <ActivityIndicator size="small" color={colors.muted} />
          ) : (
            <WifiOff size={20} color={colors.danger} />
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          android_ripple={{ color: colors.default, borderless: true, radius: 22 }}
          hitSlop={8}
          onPress={() => router.push('/settings')}
          style={styles.menu}
        >
          <Settings size={22} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  demo: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  demoText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  status: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  menu: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
})
