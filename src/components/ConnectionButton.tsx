import { CloudOff, Signal, Wifi } from 'lucide-react-native'
import { Pressable, StyleSheet } from 'react-native'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { openSettings } from '@/components/settings/routes'
import { useCapabilities } from '@/hooks/useCapabilities'
import { useNow } from '@/hooks/useNow'
import { connectionTier, uplinkHeadline } from '@/lib/connection'
import { radius, useTheme } from '@/theme'

/** The router's way into Connectivity. A van without the router capability gets no header icon. */
export function ConnectionButton() {
  const { colors } = useTheme()
  const { state, status, tailscale } = useRenewvanBus()
  const capabilities = useCapabilities()
  const now = useNow(30_000).getTime()
  if (capabilities.router.state !== 'present') return null

  const id = Object.keys(state.routers)[0]
  const router = id === undefined ? undefined : state.routers[id]
  const tier = connectionTier({
    rsrp: router?.signal_rsrp_dbm,
    routerHealth: capabilities.router.offline ? 'offline' : null,
    lastReceivedAt: id === undefined ? undefined : state.routerUpdatedAt[id],
    now,
    busStatus: status,
    tailscale,
  })
  const Icon = tier === 'connected' ? Wifi : tier === 'offline' ? CloudOff : Signal
  const color =
    tier === 'offline' || tier === 'no-service'
      ? colors.danger
      : tier === 'checking' || tier === 'bars-1' || tier === 'bars-2'
        ? colors.warning
        : colors.success

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Connection, ${uplinkHeadline(router, tier)}`}
      android_ripple={{ color: colors.default }}
      hitSlop={8}
      onPress={() => openSettings('connectivity')}
      style={styles.button}
    >
      <Icon size={22} color={color} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: radius['3xl'],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
