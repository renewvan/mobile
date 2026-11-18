import { useEffect, useRef, useState } from 'react'
import type { Relay } from '@/types'

/** A command that has not changed the relay's state in this long is reported as failed. */
export const GIVE_UP_MS = 4000

/**
 * What a command in flight shows. `pending` shows the tapped target with a spinner until the
 * retained `state` changes; `failed` means 4 seconds passed with no change, and the control is back
 * on the real state. `from` is the state at the tap: arrival of any other state ends it.
 */
export type Phase =
  { kind: 'pending'; to: boolean; from: boolean | undefined } | { kind: 'failed'; to: boolean }

type Timer = ReturnType<typeof setTimeout>

/**
 * Pending and failed commands per relay id, and the 4 second give-up (dashboard `RelaysPage`).
 *
 * Whether a stored phase still applies is derived at render from the relay's real `state`, not
 * synced by an effect: a pending command is over once the state moves off the value it was sent
 * from, and a failure is over once the state reaches the target on its own. The app never claims a
 * relay switched because it was asked to; only the bus says so (hub ADR 0013).
 */
export function useCommandPhases(
  relays: Record<string, Relay>,
  frozen: boolean,
  send: (id: string, on: boolean) => void,
) {
  const [phases, setPhases] = useState<Record<string, Phase>>({})
  const [wasFrozen, setWasFrozen] = useState(frozen)
  const timers = useRef<Map<string, Timer>>(new Map())

  const clearTimers = () => {
    for (const handle of timers.current.values()) clearTimeout(handle)
    timers.current.clear()
  }

  // A Driver that drops, or Demo mode, ends every command in flight, so no stale target or failure
  // surfaces when it returns. Adjusting state while rendering is React's way to reset on a change.
  if (frozen !== wasFrozen) {
    setWasFrozen(frozen)
    if (frozen) setPhases({})
  }

  useEffect(() => {
    if (frozen) clearTimers()
  }, [frozen])

  useEffect(() => clearTimers, [])

  const request = (id: string, to: boolean) => {
    // The page is disabled while frozen; this guards a confirmation that was already open.
    if (frozen) return
    const running = timers.current.get(id)
    if (running !== undefined) clearTimeout(running)
    setPhases((prev) => ({ ...prev, [id]: { kind: 'pending', to, from: relays[id]?.state } }))
    const handle = setTimeout(() => {
      timers.current.delete(id)
      setPhases((prev) =>
        prev[id]?.kind === 'pending' ? { ...prev, [id]: { kind: 'failed', to } } : prev,
      )
    }, GIVE_UP_MS)
    timers.current.set(id, handle)
    send(id, to)
  }

  /** The phase that still applies to a relay, or nothing once its state has settled it. */
  const phaseOf = (id: string): Phase | undefined => {
    const phase = phases[id]
    const state = relays[id]?.state
    if (phase?.kind === 'pending' && state !== phase.from) return undefined
    if (phase?.kind === 'failed' && state === phase.to) return undefined
    return phase
  }

  return { phaseOf, request }
}
