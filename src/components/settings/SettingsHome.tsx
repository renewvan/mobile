import {
  Bell,
  Car,
  Gauge,
  House,
  Map as MapIcon,
  Monitor,
  Repeat2,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  Wifi,
  Workflow,
  Zap,
} from 'lucide-react-native'
import { useAlerts } from '@/alerts/AlertsProvider'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { driversSummary, unsupportedDrivers } from '@/lib/drivers'
import { gpsSummary } from '@/lib/gps'
import { routerDriver, routerName } from '@/lib/routerDriver'
import { usePreferences } from '@/preferences/PreferencesProvider'
import { shownWidgets } from '@/preferences/preferences'
import { useSession } from '@/session/SessionProvider'
import { useTheme } from '@/theme'
import { isCompleteGps } from '@/types'
import { DetailList, DetailRow, Group, NavRow, SettingsScreen } from './kit'
import { openSettings } from './routes'
import { useSettingsData } from './useSettingsData'

/**
 * Settings: the account placeholder, device configuration, the sections' own choices, then the hub,
 * advanced screens and this phone.
 */
export function SettingsHome() {
  const { colors } = useTheme()
  const { drivers, state } = useSettingsData()
  const { connection } = useSession()
  const { status, settled } = useRenewvanBus()
  const { openCount } = useAlerts()
  const { alertsEnabled, homeLayout, van } = usePreferences()
  const icon = { size: 22, color: colors.muted }
  return (
    <SettingsScreen title="Settings">
      <DetailList heading="My account">
        <DetailRow label="Van" value={connection?.target.display ?? null} />
        <DetailRow label="Name" value={van.name || null} />
      </DetailList>
      <NavRow
        icon={<Workflow {...icon} />}
        label="Devices"
        description={driversSummary(drivers)}
        attention={settled && unsupportedDrivers(state).length > 0}
        onPress={() => openSettings('devices')}
      />
      <Group title="Sections">
        <NavRow
          icon={<House {...icon} />}
          label="Home"
          description={`${shownWidgets(homeLayout).length} widgets shown`}
          onPress={() => openSettings('widgets')}
        />
        <NavRow
          icon={<Zap {...icon} />}
          label="Energy"
          description="Power layout"
          onPress={() => openSettings('power-page')}
        />
        <NavRow
          icon={<Gauge {...icon} />}
          label="Levels"
          description="Temperature sensors shown"
          onPress={() => openSettings('temperature-page')}
        />
        <NavRow
          icon={<SlidersHorizontal {...icon} />}
          label="Controls"
          description="Relay groups"
          onPress={() => openSettings('relays-page')}
        />
      </Group>
      <Group title="Hub">
        <NavRow
          icon={<Settings2 {...icon} />}
          label="General"
          description="Theme, firmware, demo mode"
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
        <NavRow
          icon={<Repeat2 {...icon} />}
          label="Automation"
          description="Scenes and automation"
          onPress={() => openSettings('automation')}
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
