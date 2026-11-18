import { emptyRenewvanBusState, type DriverInfo, type RenewvanBusState } from '@/types'

// The payload-handling half of the bus adapter: what each topic does to the state the screens
// read. Pure, so it is tested without a broker (`reducer.test.ts`). Ported from the dashboard's
// `src/hooks/useRenewvanBus.ts`; the wire contract is the hub's (`hub/schema/*.schema.json`).

/** The hub plugin's retained status (hub `hub-status.schema.json`). */
export interface HubStatus {
  ip: string | null
  hostname: string | null
  version?: string
}

/** The Tailscale plugin's retained status (hub `tailscale-status.schema.json`). */
export interface TailscaleStatus {
  enabled: boolean
  connected: boolean
  ip: string | null
  hostname: string | null
  peers: number
}

export type DisplayPower = 'on' | 'off' | null
export type AutoSleepTimeoutMinutes = 1 | 5 | 15 | 30
export const AUTO_SLEEP_TIMEOUT_CHOICES: readonly AutoSleepTimeoutMinutes[] = [1, 5, 15, 30]

/**
 * The kiosk's display as its host plugin reports it (`renewvan/kiosk/display/*`). Each is null
 * until its retained topic arrives: a van with no kiosk plugin never publishes them, and a control
 * for a value nobody reported stays disabled.
 */
export interface KioskDisplay {
  power: DisplayPower
  /** 0 to 100. */
  brightness: number | null
  autoSleepEnabled: boolean | null
  autoSleepTimeoutMinutes: AutoSleepTimeoutMinutes | null
}

/** Everything the bus has said, for both the real van and the simulated one. */
export interface BusData {
  real: RenewvanBusState
  demo: RenewvanBusState
  /** The shared Demo mode flag (`renewvan/demo/enabled`): true while every client reads the simulated van. */
  demoMode: boolean
  hubStatus: HubStatus | null
  tailscale: TailscaleStatus | null
  kiosk: KioskDisplay
  /** The shared entity icons (`renewvan/hub/icons`): `<entity>/<id>` to a lucide component name. */
  entityIcons: Record<string, string>
  /** `auto` or a battery instance id; null reads as `auto`. */
  primaryBattery: string | null
  /** Relay id to group name; a relay with none is Unassigned. */
  relayGroups: Record<string, string>
  /** Group names in display order; null until the hub publishes one. */
  relayGroupList: string[] | null
  /** Relay ids, first to last, inside a group card. */
  relayOrder: string[]
}

export const emptyBusData: BusData = {
  real: emptyRenewvanBusState,
  demo: emptyRenewvanBusState,
  demoMode: false,
  hubStatus: null,
  tailscale: null,
  kiosk: { power: null, brightness: null, autoSleepEnabled: null, autoSleepTimeoutMinutes: null },
  entityIcons: {},
  primaryBattery: null,
  relayGroups: {},
  relayGroupList: null,
  relayOrder: [],
}

/** The real van's topic root; every host plugin (kiosk, tailscale, hub) lives here, always. */
export const REAL_ROOT = 'renewvan'
/** The simulated van's namespace (hub `docs/demo-mode.md`): same shapes, one level down. */
const DEMO_ROOT = `${REAL_ROOT}/demo`
const TOPIC_DEMO_ENABLED = `${DEMO_ROOT}/enabled`
const TOPIC_DEMO_ENABLED_SET = `${TOPIC_DEMO_ENABLED}/set`
const TOPIC_HUB_STATUS = `${REAL_ROOT}/hub/status`
const TOPIC_TAILSCALE = `${REAL_ROOT}/tailscale/status`
const TOPIC_ENTITY_ICONS = `${REAL_ROOT}/hub/icons`
const TOPIC_PRIMARY_BATTERY = `${REAL_ROOT}/hub/primary-battery`
const TOPIC_RELAY_GROUPS = `${REAL_ROOT}/hub/relay-groups`
const TOPIC_RELAY_GROUP_LIST = `${REAL_ROOT}/hub/relay-group-list`
const TOPIC_RELAY_ORDER = `${REAL_ROOT}/hub/relay-order`
const KIOSK_PREFIX = `${REAL_ROOT}/kiosk/`
const TOPIC_PRIMARY_BATTERY_SET = `${TOPIC_PRIMARY_BATTERY}/set`
const TOPIC_DISPLAY_POWER = `${KIOSK_PREFIX}display/power`
const TOPIC_BRIGHTNESS = `${KIOSK_PREFIX}display/brightness`
const TOPIC_AUTO_SLEEP_ENABLED = `${KIOSK_PREFIX}display/auto-sleep-enabled`
const TOPIC_AUTO_SLEEP_TIMEOUT = `${KIOSK_PREFIX}display/auto-sleep-timeout-minutes`

// `<id>/<property>` is exactly two segments, so `<id>/name/set` command topics (three) never match.
function entityPattern(root: string): RegExp {
  return new RegExp(
    `^${root}/(tank|relay|battery|solar|charger|router|gps|temperature|tilt|heater)/([^/]+)/([^/]+)$`,
  )
}
const ENTITY_PATTERN = { real: entityPattern(REAL_ROOT), demo: entityPattern(DEMO_ROOT) }

/**
 * `<root>/<driver>/info` and `<root>/<driver>/health`. `demo` sits where a Driver key would on the
 * real root and is reserved: it is the simulated van's namespace, never a Driver.
 */
function driverPattern(root: string, reserved: string | null): RegExp {
  const key = reserved === null ? '[^/]+' : `(?!${reserved}/)[^/]+`
  return new RegExp(`^${root}/(${key})/(info|health)$`)
}
const DRIVER_PATTERN = {
  real: driverPattern(REAL_ROOT, 'demo'),
  demo: driverPattern(DEMO_ROOT, null),
}

/**
 * Every entity payload is the JSON-encoded value of its schema type: a bare number, a *quoted*
 * string (`"ok"`, not `ok`). Anything that does not parse, including the empty payload that clears
 * a retained topic, reads as `undefined`.
 */
function parseValue(payload: string): unknown {
  try {
    return JSON.parse(payload)
  } catch {
    return undefined
  }
}

function accumulate<T>(
  record: Record<string, T>,
  id: string,
  property: string,
  value: unknown,
): Record<string, T> {
  const current = record[id] as Record<string, unknown> | undefined
  // A retained topic re-published with the value it already had changes nothing: the same record
  // comes back, so the state stays the same object and no screen re-renders for it.
  if (current !== undefined && property in current && sameValue(current[property], value)) {
    return record
  }
  return { ...record, [id]: { ...record[id], [property]: value } as T }
}

/** Equal bus values: the same primitive, or objects and arrays with the same JSON. */
function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  return (
    typeof a === 'object' &&
    a !== null &&
    typeof b === 'object' &&
    b !== null &&
    JSON.stringify(a) === JSON.stringify(b)
  )
}

/** `prev` with one entity record replaced, or `prev` itself when the record did not change. */
function withRecord<K extends keyof RenewvanBusState>(
  prev: RenewvanBusState,
  key: K,
  next: RenewvanBusState[K],
): RenewvanBusState {
  return next === prev[key] ? prev : { ...prev, [key]: next }
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A light structural check of a Driver info payload; anything else reads as no info. */
function parseDriverInfo(payload: string): DriverInfo | undefined {
  const o = parseValue(payload)
  if (!isRecord(o)) return undefined
  if (
    typeof o.driver !== 'string' ||
    typeof o.product !== 'string' ||
    typeof o.source !== 'string' ||
    typeof o.version !== 'string'
  ) {
    return undefined
  }
  if (o.publishes !== undefined && !isStringList(o.publishes)) return undefined
  const info: DriverInfo = {
    driver: o.driver,
    product: o.product,
    source: o.source,
    version: o.version,
  }
  if (o.publishes !== undefined) info.publishes = o.publishes
  if (typeof o.manufacturer === 'string') info.manufacturer = o.manufacturer
  if (typeof o.homepage === 'string') info.homepage = o.homepage
  if (typeof o.board_serial === 'string') info.board_serial = o.board_serial
  return info
}

function parseHubStatus(payload: string): HubStatus | null {
  const o = parseValue(payload)
  if (!isRecord(o)) return null
  if (!isStringOrNull(o.ip) || !isStringOrNull(o.hostname)) return null
  if (o.version === undefined) return { ip: o.ip, hostname: o.hostname }
  if (typeof o.version !== 'string' || o.version === '') return null
  return { ip: o.ip, hostname: o.hostname, version: o.version }
}

/** All five fields are required; an empty payload or anything malformed reads as no status. */
function parseTailscaleStatus(payload: string): TailscaleStatus | null {
  const o = parseValue(payload)
  if (!isRecord(o)) return null
  if (
    typeof o.enabled !== 'boolean' ||
    typeof o.connected !== 'boolean' ||
    !isStringOrNull(o.ip) ||
    !isStringOrNull(o.hostname) ||
    typeof o.peers !== 'number' ||
    !Number.isInteger(o.peers) ||
    o.peers < 0
  ) {
    return null
  }
  return {
    enabled: o.enabled,
    connected: o.connected,
    ip: o.ip,
    hostname: o.hostname,
    peers: o.peers,
  }
}

/** `<entity>/<id>` to an icon name; an entry that is not a string is dropped on its own. */
function parseEntityIcons(payload: string): Record<string, string> {
  const value = parseValue(payload)
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

/** The kiosk display topics. Their payloads are bare (`on`, `42`, `true`), and an invalid one is ignored. */
function applyKioskMessage(prev: KioskDisplay, topic: string, payload: string): KioskDisplay {
  if (topic === TOPIC_DISPLAY_POWER) {
    return payload === 'on' || payload === 'off' ? { ...prev, power: payload } : prev
  }
  if (topic === TOPIC_BRIGHTNESS) {
    const value = Number(payload)
    const valid = payload !== '' && Number.isInteger(value) && value >= 0 && value <= 100
    return valid ? { ...prev, brightness: value } : prev
  }
  if (topic === TOPIC_AUTO_SLEEP_ENABLED) {
    return payload === 'true' || payload === 'false'
      ? { ...prev, autoSleepEnabled: payload === 'true' }
      : prev
  }
  if (topic === TOPIC_AUTO_SLEEP_TIMEOUT) {
    const choice = AUTO_SLEEP_TIMEOUT_CHOICES.find((minutes) => String(minutes) === payload)
    return choice === undefined ? prev : { ...prev, autoSleepTimeoutMinutes: choice }
  }
  return prev
}

function parsePrimaryBattery(payload: string): string | null {
  const value = parseValue(payload)
  return typeof value === 'string' && value !== '' ? value : null
}

/** Relay id to group name; an entry that is not a non-empty string is dropped on its own. */
function parseRelayGroups(payload: string): Record<string, string> {
  const value = parseValue(payload)
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '',
    ),
  )
}

function uniqueStrings(value: unknown[]): string[] {
  return [...new Set(value.filter((s): s is string => typeof s === 'string' && s !== ''))]
}

/** Not an array reads as no list (null), not as an empty one. */
function parseRelayGroupList(payload: string): string[] | null {
  const value = parseValue(payload)
  return Array.isArray(value) ? uniqueStrings(value) : null
}

function parseRelayOrder(payload: string): string[] {
  const value = parseValue(payload)
  return Array.isArray(value) ? uniqueStrings(value) : []
}

/** An empty payload clears a retained topic; so does anything that is not a valid value. */
function applyDriverMessage(
  prev: RenewvanBusState,
  key: string,
  topic: 'info' | 'health',
  payload: string,
): RenewvanBusState {
  const { [key]: current, ...others } = prev.drivers
  const next = { ...current }
  if (topic === 'info') {
    const info = parseDriverInfo(payload)
    if (info) next.info = info
    else delete next.info
  } else if (payload === 'online' || payload === 'offline') {
    next.health = payload
  } else {
    delete next.health
  }
  const empty = next.info === undefined && next.health === undefined
  return { ...prev, drivers: empty ? others : { ...others, [key]: next } }
}

/** Every property the heater schema publishes; anything else on a heater topic is a command echo. */
const HEATER_PROPERTIES: ReadonlySet<string> = new Set([
  'driver',
  'name',
  'phase',
  'status_code',
  'error_code',
  'internal_temperature_c',
  'heater_temperature_c',
  'external_temperature_c',
  'voltage_v',
  'setpoint_c',
  'power_level',
  'mode',
  'runtime_s',
  'fan_rpm',
  'fuel_pump_hz',
  'ventilating',
  'thermostat',
  'commands_enabled',
])

/**
 * relay: `state` (a JSON boolean) and the optional `name` and `driver`, nothing else. `set` is a
 * four-segment topic, so the broker's echo of our own command reaches this reducer: it must never
 * land as state. Clearing `state` means the relay is gone, not switched off (hub ADR 0008, 0013).
 */
function applyRelayMessage(
  prev: RenewvanBusState,
  id: string,
  property: string,
  value: unknown,
): RenewvanBusState {
  if (property !== 'state' && property !== 'name' && property !== 'driver') return prev
  if (value === undefined) {
    if (property === 'state') {
      const { [id]: _removed, ...rest } = prev.relays
      return { ...prev, relays: rest }
    }
    const { [property]: _dropped, ...kept } = prev.relays[id] ?? {}
    return { ...prev, relays: { ...prev.relays, [id]: kept } }
  }
  if (property === 'state') {
    // Only a JSON boolean is a state: coercing would read `"off"` or `"false"` as switched on.
    if (typeof value !== 'boolean') return prev
    return { ...prev, relays: { ...prev.relays, [id]: { ...prev.relays[id], state: value } } }
  }
  if (typeof value !== 'string' || value === '') return prev
  return { ...prev, relays: { ...prev.relays, [id]: { ...prev.relays[id], [property]: value } } }
}

function applyMessage(
  prev: RenewvanBusState,
  topic: string,
  payload: string,
  pattern: RegExp,
  driverTopicPattern: RegExp,
  now: number,
): RenewvanBusState {
  const driverMatch = driverTopicPattern.exec(topic)
  if (driverMatch) {
    return applyDriverMessage(prev, driverMatch[1], driverMatch[2] as 'info' | 'health', payload)
  }
  const match = pattern.exec(topic)
  if (!match) return prev
  const [, domain, id, property] = match
  const value = parseValue(payload)
  // `driver` and `name` are JSON strings on every entity; anything else never lands.
  if (
    (property === 'driver' || property === 'name') &&
    value !== undefined &&
    typeof value !== 'string'
  ) {
    return prev
  }
  switch (domain) {
    case 'router':
      return {
        ...prev,
        routers: accumulate(prev.routers, id, property, value),
        routerUpdatedAt: { ...prev.routerUpdatedAt, [id]: now },
      }
    case 'tank':
      return withRecord(prev, 'tanks', accumulate(prev.tanks, id, property, value))
    case 'gps':
      return withRecord(prev, 'gps', accumulate(prev.gps, id, property, value))
    case 'heater':
      // Only the schema's published fields may land, never the echo of a command (hub ADR 0021).
      if (!HEATER_PROPERTIES.has(property)) return prev
      return withRecord(prev, 'heaters', accumulate(prev.heaters, id, property, value))
    case 'tilt':
      return withRecord(prev, 'tilt', accumulate(prev.tilt, id, property, value))
    case 'temperature':
      return withRecord(prev, 'temperatures', accumulate(prev.temperatures, id, property, value))
    case 'battery':
      return withRecord(prev, 'batteries', accumulate(prev.batteries, id, property, value))
    case 'solar':
      return withRecord(prev, 'solar', accumulate(prev.solar, id, property, value))
    case 'charger':
      return withRecord(prev, 'chargers', accumulate(prev.chargers, id, property, value))
    default:
      return applyRelayMessage(prev, id, property, value)
  }
}

/** One message from `renewvan/#` applied to everything the bus has said so far. */
export function reduceBusMessage(
  prev: BusData,
  topic: string,
  payload: string,
  now: number = Date.now(),
): BusData {
  if (topic === TOPIC_DEMO_ENABLED) {
    // A JSON boolean, like every bus payload; anything else is not a state.
    if (payload !== 'true' && payload !== 'false') return prev
    return { ...prev, demoMode: payload === 'true' }
  }
  if (topic === TOPIC_HUB_STATUS) return { ...prev, hubStatus: parseHubStatus(payload) }
  if (topic === TOPIC_TAILSCALE) return { ...prev, tailscale: parseTailscaleStatus(payload) }
  if (topic === TOPIC_ENTITY_ICONS) return { ...prev, entityIcons: parseEntityIcons(payload) }
  if (topic.startsWith(KIOSK_PREFIX)) {
    const kiosk = applyKioskMessage(prev.kiosk, topic, payload)
    return kiosk === prev.kiosk ? prev : { ...prev, kiosk }
  }
  if (topic === TOPIC_PRIMARY_BATTERY) {
    return { ...prev, primaryBattery: parsePrimaryBattery(payload) }
  }
  if (topic === TOPIC_RELAY_GROUPS) return { ...prev, relayGroups: parseRelayGroups(payload) }
  if (topic === TOPIC_RELAY_GROUP_LIST) {
    return { ...prev, relayGroupList: parseRelayGroupList(payload) }
  }
  if (topic === TOPIC_RELAY_ORDER) return { ...prev, relayOrder: parseRelayOrder(payload) }
  const real = applyMessage(
    prev.real,
    topic,
    payload,
    ENTITY_PATTERN.real,
    DRIVER_PATTERN.real,
    now,
  )
  const demo = applyMessage(
    prev.demo,
    topic,
    payload,
    ENTITY_PATTERN.demo,
    DRIVER_PATTERN.demo,
    now,
  )
  return real === prev.real && demo === prev.demo ? prev : { ...prev, real, demo }
}

/** The van the screens show: the simulated one while Demo mode is on, never a mix. */
export function visibleState(data: BusData): RenewvanBusState {
  return data.demoMode ? data.demo : data.real
}

/**
 * Whether a command may be sent. Demo state is read-only: while the switch is on, only kiosk
 * commands, the Primary battery choice and the Demo switch itself go out, so a tap never switches the real van behind a
 * simulated screen.
 */
export function commandAllowed(demoMode: boolean, topic: string): boolean {
  return (
    !demoMode ||
    topic.startsWith(KIOSK_PREFIX) ||
    topic === TOPIC_PRIMARY_BATTERY_SET ||
    // The switch itself: how anyone leaves Demo mode.
    topic === TOPIC_DEMO_ENABLED_SET
  )
}
