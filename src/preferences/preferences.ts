// The app's own settings: what this phone's owner chose for this phone. They live on the phone
// (the dashboard keeps its equivalents in the kiosk's browser storage, which nothing remote can
// reach), apart from everything shared on the bus, which Settings changes for every client.

/** The widgets the Start tab can show, in their shipped order. */
export const START_WIDGET_IDS = [
  'temperature',
  'map',
  'energy',
  'heater',
  'solar',
  'tilt',
  'fresh-water',
  'grey-water',
] as const
export type StartWidgetId = (typeof START_WIDGET_IDS)[number]

export const START_WIDGET_LABELS: Record<StartWidgetId, string> = {
  temperature: 'Temperature',
  map: 'Map',
  energy: 'Energy',
  heater: 'Heater',
  solar: 'Solar production',
  tilt: 'Tilt',
  'fresh-water': 'Fresh water',
  'grey-water': 'Grey water',
}

export const DEFAULT_START_LAYOUT: readonly StartWidgetId[] = START_WIDGET_IDS

export type ThemeChoice = 'system' | 'light' | 'dark'
export type DevicesSort = 'driver' | 'entity'

/**
 * How the power-flow diagram is drawn, as the dashboard's Power page setting. The dashboard also
 * knows two layouts without the van (`tiles`, `orbs`); like its own Settings, the app offers the
 * two with it.
 */
export const POWER_LAYOUTS = ['van-tiles', 'van-orbs'] as const
export type PowerLayout = (typeof POWER_LAYOUTS)[number]
export const POWER_LAYOUT_LABELS: Record<PowerLayout, string> = {
  'van-tiles': 'Van tiles',
  'van-orbs': 'Van orbs',
}
export const POWER_LAYOUT_HINTS: Record<PowerLayout, string> = {
  'van-tiles':
    'The van at the centre, filled to its charge, with boxed readings plugged into it by flowing lines.',
  'van-orbs':
    'The van at the centre, filled to its charge, with round readings plugged into it by flowing lines.',
}

/** The van's details, as on the dashboard's Settings › Van. */
export interface Van {
  name: string
  brand: string
  model: string
  kms: string
  plate: string
}
export const VAN_FIELDS: readonly (keyof Van)[] = ['name', 'brand', 'model', 'kms', 'plate']
export const VAN_LABELS: Record<keyof Van, string> = {
  name: 'Name',
  brand: 'Brand',
  model: 'Model',
  kms: 'Kms.',
  plate: 'Plate',
}

export interface Preferences {
  /** Light, dark, or whatever the phone is set to. */
  theme: ThemeChoice
  /** The Start tab's widgets, in order; one not listed is not shown. */
  startLayout: readonly StartWidgetId[]
  /** Temperature sensor ids the Climate tab leaves out. */
  hiddenTemperatures: readonly string[]
  /** How Settings › Devices lists them. */
  devicesSort: DevicesSort
  /** The Power tab's diagram, and the Start tab's Energy widget, which draws the same one. */
  powerLayout: PowerLayout
  van: Van
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  startLayout: DEFAULT_START_LAYOUT,
  hiddenTemperatures: [],
  devicesSort: 'driver',
  powerLayout: 'van-tiles',
  van: { name: '', brand: '', model: '', kms: '', plate: '' },
}

function isWidgetId(value: unknown): value is StartWidgetId {
  return START_WIDGET_IDS.some((id) => id === value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Reads what was stored. Every field is checked on its own and falls back to its default, so a
 * value written by an older or newer version of the app never breaks the rest.
 */
export function parsePreferences(raw: string | null): Preferences {
  let stored: unknown
  try {
    stored = JSON.parse(raw ?? 'null')
  } catch {
    return DEFAULT_PREFERENCES
  }
  if (!isRecord(stored)) return DEFAULT_PREFERENCES
  const van = isRecord(stored.van) ? stored.van : {}
  const text = (value: unknown) => (typeof value === 'string' ? value : '')
  return {
    theme:
      stored.theme === 'light' || stored.theme === 'dark' || stored.theme === 'system'
        ? stored.theme
        : DEFAULT_PREFERENCES.theme,
    // An empty layout is a choice (no widgets), so only a missing or malformed one is defaulted.
    startLayout: Array.isArray(stored.startLayout)
      ? [...new Set(stored.startLayout.filter(isWidgetId))]
      : DEFAULT_START_LAYOUT,
    hiddenTemperatures: Array.isArray(stored.hiddenTemperatures)
      ? [...new Set(stored.hiddenTemperatures.filter((id) => typeof id === 'string'))]
      : [],
    devicesSort: stored.devicesSort === 'entity' ? 'entity' : 'driver',
    powerLayout: stored.powerLayout === 'van-orbs' ? 'van-orbs' : 'van-tiles',
    van: {
      name: text(van.name),
      brand: text(van.brand),
      model: text(van.model),
      kms: text(van.kms),
      plate: text(van.plate),
    },
  }
}

/** `list` with the item at `from` moved to `to`; unchanged when either is out of range. */
export function moved<T>(list: readonly T[], from: number, to: number): readonly T[] {
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < list.length
  if (!inRange(from) || !inRange(to) || from === to) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function isDefaultLayout(layout: readonly StartWidgetId[]): boolean {
  return (
    layout.length === DEFAULT_START_LAYOUT.length &&
    layout.every((id, i) => id === DEFAULT_START_LAYOUT[i])
  )
}
