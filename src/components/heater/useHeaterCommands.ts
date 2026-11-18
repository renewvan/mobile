import { useToast } from 'heroui-native'
import { useEffect, useRef, useState } from 'react'
import type { Heater } from '@/types'

/**
 * A command that has not changed its retained field in this long is reported as failed. Longer than
 * the relay's 4 s: a settings write is only confirmed by the Driver's next settings read (hub ADR 0021).
 */
export const GIVE_UP_MS = 6000

/** The four things a card can command; each is confirmed by its own retained field changing. */
export type Field = 'run' | 'mode' | 'setpoint' | 'power'

export interface Pending {
  /** The value the retained field had at the tap: any other value ends the wait. */
  from: unknown
  /** The number sent, for a dial that shows its target while the heater catches up. */
  to?: number
  failed: boolean
}

const FAILURE_TITLES: Record<Field, string> = {
  setpoint: "Target didn't change",
  power: "Power didn't change",
  mode: "Mode didn't change",
  run: "Heater didn't respond",
}

/** The retained value that confirms each command. A start or stop is confirmed by the phase moving. */
function observed(heater: Heater, field: Field): unknown {
  switch (field) {
    case 'run':
      return heater.phase
    case 'mode':
      // Temperature and Thermostat share a `mode`: the pair is what a mode change moves.
      return `${heater.mode}/${heater.thermostat}`
    case 'setpoint':
      return heater.setpoint_c
    case 'power':
      return heater.power_level
  }
}

type Timer = ReturnType<typeof setTimeout>

/**
 * Pending and failed commands for one heater (dashboard `HeaterPage`). Whether a stored entry
 * still applies is derived at render from the heater's real fields: it is over once the field
 * leaves the value it was sent from. A command the heater never confirms is reported with the
 * toast (the dashboard's `toast.danger`).
 */
export function useHeaterCommands(heater: Heater, frozen: boolean) {
  const { toast } = useToast()
  const [pending, setPending] = useState<Partial<Record<Field, Pending>>>({})
  const [wasFrozen, setWasFrozen] = useState(frozen)
  const timers = useRef<Map<Field, Timer>>(new Map())
  // The heater as of the latest render, so a timer can tell whether the heater has answered since.
  const latest = useRef(heater)
  useEffect(() => {
    latest.current = heater
  })

  const clearTimers = () => {
    for (const handle of timers.current.values()) clearTimeout(handle)
    timers.current.clear()
  }
  // A Driver that drops, or Demo mode, ends every command in flight.
  if (frozen !== wasFrozen) {
    setWasFrozen(frozen)
    if (frozen) setPending({})
  }
  useEffect(() => {
    if (frozen) clearTimers()
  }, [frozen])
  useEffect(() => clearTimers, [])

  const send = (field: Field, action: () => void, to?: number) => {
    if (frozen) return
    const running = timers.current.get(field)
    if (running !== undefined) clearTimeout(running)
    const from = observed(heater, field)
    setPending((prev) => ({ ...prev, [field]: { from, to, failed: false } }))
    timers.current.set(
      field,
      setTimeout(() => {
        timers.current.delete(field)
        // The heater moved on while the timer ran: it answered, so there is nothing to report.
        if (observed(latest.current, field) !== from) return
        setPending((prev) =>
          prev[field] ? { ...prev, [field]: { ...prev[field], failed: true } } : prev,
        )
        toast.show({ variant: 'danger', label: FAILURE_TITLES[field], description: heater.name })
      }, GIVE_UP_MS),
    )
    action()
  }

  /** The entry that still applies to a field, or nothing once the heater has answered. */
  const stateOf = (field: Field): Pending | undefined => {
    const entry = pending[field]
    if (entry === undefined) return undefined
    if (!entry.failed && observed(heater, field) !== entry.from) return undefined
    return entry
  }

  return { send, stateOf }
}
