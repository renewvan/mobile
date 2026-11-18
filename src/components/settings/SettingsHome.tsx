import {
  Bell,
  Car,
  Map as MapIcon,
  Monitor,
  SlidersHorizontal,
  Smartphone,
  Wifi,
  Workflow,
} from 'lucide-react-native'
import { useAlerts } from '@/alerts/AlertsProvider'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { driversSummary } from '@/lib/drivers'
import { gpsSummary } from '@/lib/gps'
import { routerDriver, routerName } from '@/lib/routerDriver'
import { usePreferences } from '@/preferences/PreferencesProvider'
import { useSession } from '@/session/SessionProvider'
import { useTheme } from '@/theme'
import { isCompleteGps } from '@/types'
import { Group, NavRow, SettingsScreen } from './kit'
import { openSettings } from './routes'
import { useSettingsData } from './useSettingsData'

/**
 * Settings, the top list, as on the dashboard: Devices first, then the hub's General, Dashboard, Alerts and
 * Connectivity, the van, and (the one thing a phone adds) this phone's own connection.
 */
export function SettingsHome() {
  const { colors } = useTheme()
  const { drivers, state } = useSettingsData()
  const { connection } = useSession()
  const { status } = useRenewvanBus()
  const { openCount } = useAlerts()
  const { alertsEnabled } = usePreferences()
  const icon = { size: 22, color: colors.muted }
  return (
    <SettingsScreen title="Settings">
      <NavRow
        icon={<Workflow {...icon} />}
        label="Devices"
        description={driversSummary(drivers)}
        onPress={() => openSettings('devices')}
      />
      <Group title="Hub">
        <NavRow
          icon={<SlidersHorizontal {...icon} />}
          label="General"
          description="Display, widgets, firmware, demo mode"
          onPress={() => openSettings('general')}
        />
        <NavRow
          icon={<Monitor {...icon} />}
          label="Dashboard"
          description="Screen power, brightness, auto-sleep"
          onPress={() => openSettings('kiosk')}
        />
        <NavRow
          icon={<Bell {...icon} />}
          label="Alerts"
          description={
            openCount > 0
              ? `${openCount} open, notifications ${alertsEnabled ? 'on' : 'off'}`
              : alertsEnabled
                ? 'Notifications on'
                : 'Notifications off'
          }
          attention={openCount > 0}
          onPress={() => openSettings('alerts')}
        />
        <NavRow
          icon={<Wifi {...icon} />}
          label="Connectivity"
          description={`${routerName(routerDriver(drivers))}, Hub, Tailscale`}
          onPress={() => openSettings('connectivity')}
        />
      </Group>
      <Group title="Advanced">
        <NavRow
          icon={<Car {...icon} />}
          label="Van"
          description="Vehicle information"
          onPress={() => openSettings('van')}
        />
        <NavRow
          icon={<MapIcon {...icon} />}
          label="Map"
          description={gpsSummary(Object.values(state.gps).find(isCompleteGps))}
          onPress={() => openSettings('map')}
        />
      </Group>
      <Group title="This phone">
        <NavRow
          icon={<Smartphone {...icon} />}
          label="Connection"
          description={connection?.target.display ?? 'Not connected'}
          attention={status === 'disconnected'}
          onPress={() => openSettings('connection')}
        />
      </Group>
    </SettingsScreen>
  )
}
