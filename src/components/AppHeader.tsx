import { router } from 'expo-router'
import { Bell } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAlerts } from '@/alerts/AlertsProvider'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { useCommands } from '@/bus/commands'
import { confirm } from '@/components/native'
import { radius, useTheme } from '@/theme'
import { LogoLockup } from './Logo'

/**
 * The options that give the tabs the platform's own header, as the dashboard's: the renewvan lockup
 * on the left, and on the right the DEMO badge while the shared Demo mode is on and the Alerts
 * bell. Worn by the first page of each tab.
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

/** The Alerts bell carries a red dot while an alert is open. */
function HeaderActions() {
  const { colors } = useTheme()
  const { demoMode } = useRenewvanBus()
  const commands = useCommands()
  const { openCount } = useAlerts()
  const attention = openCount > 0

  return (
    <View style={styles.right}>
      {demoMode ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Demo mode, tap to turn off"
          hitSlop={8}
          onPress={() =>
            confirm({
              title: 'Turn off Demo mode?',
              message: 'Every client, the kiosk included, goes back to the live van.',
              action: 'Turn off',
              onConfirm: () => commands.setDemoMode(false),
            })
          }
          style={[styles.demo, { backgroundColor: colors.warning }]}
        >
          <Text style={[styles.demoText, { color: colors.warningForeground }]}>DEMO</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={attention ? 'Alerts, open alerts' : 'Alerts'}
        android_ripple={{ color: colors.default }}
        hitSlop={8}
        onPress={() => router.push('/alerts')}
        style={styles.menu}
      >
        <Bell size={22} color={colors.foreground} />
        {attention ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  demo: { borderRadius: radius['2xl'], paddingHorizontal: 10, paddingVertical: 3 },
  demoText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  // The ripple stays inside the button, so it takes HeroUI's button corners instead of a circle.
  menu: {
    width: 32,
    height: 32,
    borderRadius: radius['3xl'],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})
