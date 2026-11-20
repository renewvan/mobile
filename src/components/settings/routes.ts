import { router } from 'expo-router'

/**
 * Every Settings screen below the top list, as the dashboard's Settings tree names them. One route
 * (`/settings/[view]`) draws them all; `id` says which driver, tank, relay group or instance.
 */
export const SETTINGS_VIEWS = [
  'devices',
  'driver',
  'driver-info',
  'tanks',
  'tank',
  'temperature',
  'gps',
  'relays',
  'heater',
  'batteries',
  'primary-battery',
  'solar',
  'chargers',
  'instance',
  'general',
  'firmware',
  'about',
  'display',
  'kiosk',
  'alerts',
  'widgets',
  'power-page',
  'temperature-page',
  'relays-page',
  'relay-group',
  'connectivity',
  'cellular',
  'hub',
  'tailscale',
  'van',
  'map',
  'automation',
  'connection',
] as const
export type SettingsView = (typeof SETTINGS_VIEWS)[number]

export function isSettingsView(value: unknown): value is SettingsView {
  return SETTINGS_VIEWS.some((view) => view === value)
}

/** Pushes a Settings screen onto the native stack, so Back and the back gesture return from it. */
export function openSettings(view: SettingsView, id?: string): void {
  router.push({ pathname: '/settings/[view]', params: id === undefined ? { view } : { view, id } })
}
