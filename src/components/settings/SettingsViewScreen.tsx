import { useLocalSearchParams } from 'expo-router'
import type { ReactNode } from 'react'
import { instanceLabel, parseInstanceKey } from '@/lib/instances'
import { routerDriver, routerName } from '@/lib/routerDriver'
import { FLUID_LABELS } from '@/lib/tank-labels'
import { sensorLabel } from '@/lib/temperature'
import { CellularView, ConnectivityView, HubView, TailscaleView } from './connectivity'
import {
  DevicesView,
  DriverInfoView,
  DriverView,
  GpsListView,
  HeaterView,
  InstancesView,
  InstanceView,
  PrimaryBatteryView,
  RelaysListView,
  TanksView,
  TankView,
  TemperatureListView,
} from './devices'
import {
  AboutView,
  AlertsView,
  ConnectionView,
  DisplayView,
  FirmwareView,
  GeneralView,
  KioskView,
  PowerPageView,
  RelayGroupView,
  RelaysPageView,
  TemperaturePageView,
  VanView,
  WidgetsView,
} from './general'
import { VanMap } from '@/components/map/VanMap'
import { Empty, SettingsScreen } from './kit'
import { isSettingsView, type SettingsView } from './routes'
import { useSettingsData, type SettingsData } from './useSettingsData'

const TITLES: Record<SettingsView, string> = {
  devices: 'Devices',
  driver: 'Driver',
  'driver-info': 'Driver',
  tanks: 'Tanks',
  tank: 'Tank',
  temperature: 'Temperature',
  gps: 'GPS',
  relays: 'Relays',
  heater: 'Heater',
  batteries: 'Batteries',
  'primary-battery': 'Primary battery',
  solar: 'Solar Chargers',
  chargers: 'Chargers',
  instance: 'Device',
  general: 'General',
  firmware: 'Firmware',
  about: 'About',
  display: 'Display & Appearance',
  kiosk: 'Dashboard',
  alerts: 'Alerts',
  widgets: 'Widgets',
  'power-page': 'Power page',
  'temperature-page': 'Temperature page',
  'relays-page': 'Relays page',
  'relay-group': 'Group',
  connectivity: 'Connectivity',
  cellular: 'Cellular',
  hub: 'Hub',
  tailscale: 'Tailscale',
  van: 'Van',
  map: 'Map',
  connection: 'Connection',
}

/** The app bar's title: the thing itself where the screen is about one (a driver, a tank, a relay). */
function titleOf(view: SettingsView, id: string | undefined, data: SettingsData): string {
  const { state, drivers } = data
  if (id !== undefined) {
    if (view === 'driver' || view === 'driver-info') {
      return drivers.find((row) => row.key === id)?.name ?? TITLES[view]
    }
    if (view === 'tank') {
      const fluid = state.tanks[id]?.fluid_type
      return fluid ? FLUID_LABELS[fluid] : id
    }
    if (view === 'relay-group') return id
    if (view === 'instance') {
      const instance = parseInstanceKey(id)
      if (instance === undefined) return TITLES.instance
      const { type, id: instanceId } = instance
      if (type === 'temperature') {
        const sensor = state.temperatures[instanceId]
        return sensor ? sensorLabel(instanceId, sensor) : instanceId
      }
      if (type === 'relay') return state.relays[instanceId]?.name || instanceId
      const records = {
        battery: state.batteries,
        solar: state.solar,
        charger: state.chargers,
        gps: state.gps,
        tilt: state.tilt,
      }[type]
      return instanceLabel(instanceId, records[instanceId] ?? {}, drivers)
    }
  }
  if (view === 'cellular') return routerName(routerDriver(drivers))
  return TITLES[view]
}

const NEEDS_ID: readonly SettingsView[] = [
  'driver',
  'driver-info',
  'tank',
  'instance',
  'relay-group',
]

function content(view: SettingsView, id: string): ReactNode {
  switch (view) {
    case 'devices':
      return <DevicesView />
    case 'driver':
      return <DriverView id={id} />
    case 'driver-info':
      return <DriverInfoView id={id} />
    case 'tanks':
      return <TanksView />
    case 'tank':
      return <TankView id={id} />
    case 'temperature':
      return <TemperatureListView />
    case 'gps':
      return <GpsListView />
    case 'relays':
      return <RelaysListView />
    case 'heater':
      return <HeaterView />
    case 'batteries':
      return <InstancesView type="battery" />
    case 'primary-battery':
      return <PrimaryBatteryView />
    case 'solar':
      return <InstancesView type="solar" />
    case 'chargers':
      return <InstancesView type="charger" />
    case 'instance':
      return <InstanceView id={id} />
    case 'general':
      return <GeneralView />
    case 'firmware':
      return <FirmwareView />
    case 'about':
      return <AboutView />
    case 'display':
      return <DisplayView />
    case 'kiosk':
      return <KioskView />
    case 'alerts':
      return <AlertsView />
    case 'widgets':
      return <WidgetsView />
    case 'power-page':
      return <PowerPageView />
    case 'temperature-page':
      return <TemperaturePageView />
    case 'relays-page':
      return <RelaysPageView />
    case 'relay-group':
      return <RelayGroupView id={id} />
    case 'connectivity':
      return <ConnectivityView />
    case 'cellular':
      return <CellularView />
    case 'hub':
      return <HubView />
    case 'tailscale':
      return <TailscaleView />
    case 'van':
      return <VanView />
    case 'map':
      // Drawn full-bleed by the screen itself (see below), never inside the scrolling column.
      return null
    case 'connection':
      return <ConnectionView />
  }
}

/**
 * Every Settings screen below the top list. `view` and `id` come from the route, so a screen is a
 * real entry on the native stack: Back, the back gesture and a deep link all work on it.
 */
export function SettingsViewScreen() {
  const params = useLocalSearchParams<{ view: string; id?: string }>()
  const data = useSettingsData()
  const id = typeof params.id === 'string' && params.id !== '' ? params.id : undefined

  if (!isSettingsView(params.view) || (NEEDS_ID.includes(params.view) && id === undefined)) {
    return (
      <SettingsScreen title="Settings">
        <Empty>There is no such setting.</Empty>
      </SettingsScreen>
    )
  }
  if (params.view === 'map') {
    // The map is the screen: edge to edge under the app bar, with its own gestures.
    return (
      <SettingsScreen title={TITLES.map} scroll={false}>
        <VanMap variant="page" />
      </SettingsScreen>
    )
  }
  return (
    <SettingsScreen title={titleOf(params.view, id, data)}>
      {content(params.view, id ?? '')}
    </SettingsScreen>
  )
}
