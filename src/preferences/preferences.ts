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
  /** The van's colour on the map, `#rrggbb`; empty is the theme accent (the default blue). */
  color: string
}
export const VAN_FIELDS: readonly Exclude<keyof Van, 'color'>[] = [
  'name',
  'brand',
  'model',
  'kms',
  'plate',
]

/** Swatches Settings offers beside the default blue and a typed hex (the dashboard's list). */
export const VAN_COLOR_PRESETS: readonly string[] = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#a855f7',
  '#ec4899',
  '#e5e7eb',
  '#1f2937',
]
export const HEX_COLOR = /^#[0-9a-f]{6}$/i
export const VAN_LABELS: Record<keyof Van, string> = {
  name: 'Name',
  brand: 'Brand',
  model: 'Model',
  kms: 'Kms.',
  plate: 'Plate',
  color: 'Colour',
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
  /** Whether a new alert is posted as a system notification. The Alerts screen records them either way. */
  alertsEnabled: boolean
  van: Van
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  startLayout: DEFAULT_START_LAYOUT,
  hiddenTemperatures: [],
  devicesSort: 'driver',
  powerLayout: 'van-tiles',
  alertsEnabled: true,
  van: { name: '', brand: '', model: '', kms: '', plate: '', color: '' },
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
    alertsEnabled: stored.alertsEnabled !== false,
    van: {
      name: text(van.name),
      brand: text(van.brand),
      model: text(van.model),
      kms: text(van.kms),
      plate: text(van.plate),
      color: HEX_COLOR.test(text(van.color)) ? text(van.color) : '',
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

/** The Widgets screen's slots: the shown widgets in order, a divider, then the hidden ones as shipped. */
export function widgetSlots(layout: readonly StartWidgetId[]): (StartWidgetId | 'divider')[] {
  return [...layout, 'divider', ...START_WIDGET_IDS.filter((id) => !layout.includes(id))]
}

/**
 * The layout after the widget in slot `from` is dropped on slot `to`: whatever lands above the
 * divider is shown, in that order. The same `layout` when nothing changes (the divider cannot be
 * dragged, and the hidden widgets have no order of their own).
 */
export function layoutAfterDrop(
  layout: readonly StartWidgetId[],
  from: number,
  to: number,
): readonly StartWidgetId[] {
  const slots = widgetSlots(layout)
  if (slots[from] === 'divider') return layout
  const next = moved(slots, from, to)
  const shown = next.slice(0, next.indexOf('divider')) as StartWidgetId[]
  return shown.length === layout.length && shown.every((id, i) => id === layout[i]) ? layout : shown
}

export function isDefaultLayout(layout: readonly StartWidgetId[]): boolean {
  return (
    layout.length === DEFAULT_START_LAYOUT.length &&
    layout.every((id, i) => id === DEFAULT_START_LAYOUT[i])
  )
}
