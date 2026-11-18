import { starterBattery } from '@/lib/starterBattery'
import { FLUID_LABELS } from '@/lib/tank-labels'
import type { ConnectionStatus } from '@/bus/RenewvanBusProvider'
import type { TailscaleStatus } from '@/bus/reducer'
import { isCompleteTank, type RenewvanBusState } from '@/types'

// The phone's alert log: what the dashboard's `useAlertToasts` + `lib/alertHistory.ts` do, minus
// the toasts (a phone's equivalent is the system notification, `notifications.ts`). Every alert is
// state-driven: it opens when the bus says its condition holds and resolves when it stops. The
// log is the only memory, so an alert still open across an app restart is not opened twice.

export interface AlertContent {
  type: 'error' | 'warning'
  title: string
  description: string
}

export interface AlertEntry extends AlertContent {
  id: string
  /** Stable per-source key: `tank:<id>`, `starter-battery`, `mqtt-connection`, `tailscale-connection`. */
  key: string
  createdAt: number
  /** Set once the condition cleared; absent while the alert is open. */
  resolvedAt?: number
  /** Deleted by the user while still open: off the list, but kept so it is not raised again until it clears. */
  dismissed?: boolean
}

export const MQTT_KEY = 'mqtt-connection'
const STARTER_KEY = 'starter-battery'

// Plenty for a phone; caps storage without an expiry policy.
const MAX_ENTRIES = 200

/** The alerts the bus says hold right now, by key. Thresholds are the drivers', never applied here. */
export function desiredAlerts(args: {
  state: RenewvanBusState
  status: ConnectionStatus
  tailscale: TailscaleStatus | null
  demo: boolean
}): Record<string, AlertContent> {
  const { state, status, tailscale, demo } = args
  const desired: Record<string, AlertContent> = {}
  // Demo mode shows a simulated van: its alarms are never recorded (the real van's stay as they
  // were, see `isFrozen`).
  if (!demo) {
    for (const [id, tank] of Object.entries(state.tanks)) {
      if (!isCompleteTank(tank) || tank.alarm_state !== 'alarm') continue
      desired[`tank:${id}`] = {
        type: 'error',
        title: `${FLUID_LABELS[tank.fluid_type]} tank alarm`,
        description: 'Level requires attention.',
      }
    }
    if (starterBattery(state.batteries, state.chargers)?.low) {
      desired[STARTER_KEY] = {
        type: 'warning',
        title: 'Starter battery low',
        description: 'Drive the van, or run an emergency charge from VictronConnect.',
      }
    }
  }
  if (status === 'disconnected') {
    desired[MQTT_KEY] = {
      type: 'warning',
      title: 'Hub connection lost',
      description: 'Live data may be out of date.',
    }
  }
  if (tailscale !== null && !tailscale.connected) {
    desired['tailscale-connection'] = {
      type: 'warning',
      title: 'Tailscale disconnected',
      description: 'Remote access is unavailable.',
    }
  }
  return desired
}

export interface ReconcileFlags {
  /** The bus is mid-(re)connect: a dropped link is not yet known to have recovered or failed. */
  connecting: boolean
  /** The retained state has had time to arrive since the last (re)connect. */
  settled: boolean
  demo: boolean
}

/**
 * Whether an open alert must be left as it is. The van's alerts are not known to have cleared
 * while Demo mode shows another van, nor before the retained state has arrived after a connect
 * (`settled`): resolving them then would close a real alarm just because the phone looked away.
 * The hub link alert waits out each reconnect attempt, so a flapping link is one alert, not one
 * notification every two seconds.
 */
export function isFrozen(key: string, flags: ReconcileFlags): boolean {
  if (key === MQTT_KEY) return flags.connecting
  const van = key.startsWith('tank:') || key === STARTER_KEY
  return !flags.settled || (flags.demo && van)
}

/**
 * Opens what is newly desired and resolves what no longer is, newest first. Returns the same
 * `entries` array when nothing changed, so it can run on every render.
 */
export function reconcile(
  entries: AlertEntry[],
  desired: Record<string, AlertContent>,
  flags: ReconcileFlags,
  now: number,
): { entries: AlertEntry[]; opened: AlertEntry[]; resolved: AlertEntry[] } {
  const open = new Set<string>()
  const resolved: AlertEntry[] = []
  const next = entries.flatMap((entry) => {
    if (entry.resolvedAt !== undefined) return [entry]
    open.add(entry.key)
    if (entry.key in desired || isFrozen(entry.key, flags)) return [entry]
    const closed = { ...entry, resolvedAt: now }
    resolved.push(closed)
    // A dismissed alert was already taken off the list: its end needs no row.
    return entry.dismissed ? [] : [closed]
  })
  const opened = Object.entries(desired)
    .filter(([key]) => !open.has(key))
    .map(([key, content]) => ({ ...content, key, id: `${key}-${now}`, createdAt: now }))
  if (resolved.length === 0 && opened.length === 0) return { entries, opened, resolved }
  return { entries: [...opened, ...next].slice(0, MAX_ENTRIES), opened, resolved }
}

/** Reads the stored log; whatever is not a well-formed entry (another app version) is dropped. */
export function parseAlertLog(raw: string | null): AlertEntry[] {
  let stored: unknown
  try {
    stored = JSON.parse(raw ?? '[]')
  } catch {
    return []
  }
  if (!Array.isArray(stored)) return []
  return stored.filter(
    (e): e is AlertEntry =>
      typeof e === 'object' &&
      e !== null &&
      typeof e.id === 'string' &&
      typeof e.key === 'string' &&
      (e.type === 'error' || e.type === 'warning') &&
      typeof e.title === 'string' &&
      typeof e.description === 'string' &&
      typeof e.createdAt === 'number' &&
      (e.resolvedAt === undefined || typeof e.resolvedAt === 'number') &&
      (e.dismissed === undefined || typeof e.dismissed === 'boolean'),
  )
}

/** The log changes only through these: set whole (bus diff, stored copy, sign-out), or pruned by the user. */
export type AlertAction =
  | { type: 'set'; entries: AlertEntry[] }
  | { type: 'remove'; id: string }
  | { type: 'clearResolved' }

/** Deleting a resolved alert drops it; deleting an open one only dismisses it (see `AlertEntry.dismissed`). */
export function logReducer(entries: AlertEntry[], action: AlertAction): AlertEntry[] {
  switch (action.type) {
    case 'set':
      return action.entries
    case 'remove':
      return entries.flatMap((e) => {
        if (e.id !== action.id) return [e]
        return e.resolvedAt === undefined ? [{ ...e, dismissed: true }] : []
      })
    case 'clearResolved':
      return entries.filter((e) => e.resolvedAt === undefined)
  }
}
