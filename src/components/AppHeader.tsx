import { router } from 'expo-router'
import { Settings2 } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAlerts } from '@/alerts/AlertsProvider'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { useTheme } from '@/theme'
import { LogoLockup } from './Logo'

/**
 * The bar above every tab, as the dashboard's header: the renewvan lockup, the DEMO badge while
 * the shared Demo mode is on, and the way into Settings. The button carries a dot while an alert is
 * open or the van is out of reach; Settings shows the dot on the row that needs a look.
 */
export function AppHeader() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { status, demoMode } = useRenewvanBus()
  const { openCount } = useAlerts()
  const attention = openCount > 0 || status === 'disconnected'

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={attention ? 'Settings, needs attention' : 'Settings'}
          android_ripple={{ color: colors.default, borderless: true, radius: 22 }}
          hitSlop={8}
          onPress={() => router.push('/settings')}
          style={styles.menu}
        >
          <Settings2 size={22} color={colors.foreground} />
          {attention ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}
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
