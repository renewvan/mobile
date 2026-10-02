import { useEffect, useRef, useState } from 'react'
import mqtt, { type MqttClient } from 'mqtt'
import { emptyRenewvanBusState, type RenewvanBusState } from '../types'

// Client-side MQTT-over-WebSocket connection to the renewvan bus broker
// (Mosquitto's WS listener), per
// hub/.scratch/renewvan-hub-v0-build/issues/07-dashboard-phone-app.md — no
// polling backend, not offline-first. This is the thin adapter half of the
// ticket's seam: it owns the live connection and is intentionally not
// unit-tested (see hub spec Testing Decisions); the presentational
// components it feeds are tested separately against fixed props.

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface RenewvanBus {
  state: RenewvanBusState
  status: ConnectionStatus
}

const TOPIC_PATTERN = /^renewvan\/(tank|relay|battery)\/([^/]+)\/([^/]+)$/

function applyMessage(prev: RenewvanBusState, topic: string, payload: string): RenewvanBusState {
  const match = TOPIC_PATTERN.exec(topic)
  if (!match) return prev
  const [, domain, id, property] = match

  if (domain === 'tank') {
    const value = property === 'fluid_type' || property === 'status' ? payload : Number(payload)
    return {
      ...prev,
      tanks: {
        ...prev.tanks,
        [id]: { ...prev.tanks[id], [property]: value } as RenewvanBusState['tanks'][string],
      },
    }
  }
  if (domain === 'battery') {
    const value = property === 'charge_state' ? payload : Number(payload)
    return {
      ...prev,
      batteries: {
        ...prev.batteries,
        [id]: { ...prev.batteries[id], [property]: value } as RenewvanBusState['batteries'][string],
      },
    }
  }
  // relay: only `state`, published as normalized "true"/"false" strings.
  return {
    ...prev,
    relays: { ...prev.relays, [id]: { state: payload === 'true' } },
  }
}

/**
 * Subscribes to `renewvan/#` over MQTT-over-WebSocket and exposes the
 * accumulated retained state plus connection status. Env-configured via
 * `EXPO_PUBLIC_MQTT_WS_URL` (required), `EXPO_PUBLIC_MQTT_USERNAME`/
 * `EXPO_PUBLIC_MQTT_PASSWORD` (read-scoped credentials, optional while the
 * broker allows anonymous access) — Expo's build-time-inlined public env
 * var convention (docs.expo.dev/guides/environment-variables), same role
 * as the dashboard's `VITE_*` vars.
 */
export function useRenewvanBus(): RenewvanBus {
  // Statically referenced (not destructured) so Expo's Metro config
  // inlines it at build time — see docs.expo.dev/guides/environment-variables.
  const wsUrl = process.env.EXPO_PUBLIC_MQTT_WS_URL

  const [state, setState] = useState<RenewvanBusState>(emptyRenewvanBusState)
  // No URL configured is a known-at-mount-time terminal state, not
  // something to reach via a synchronous setState in the effect body
  // below (react-hooks/set-state-in-effect) — derive it as the initial
  // state instead.
  const [status, setStatus] = useState<ConnectionStatus>(wsUrl ? 'connecting' : 'disconnected')
  const clientRef = useRef<MqttClient | null>(null)

  useEffect(() => {
    if (!wsUrl) return

    const client = mqtt.connect(wsUrl, {
      username: process.env.EXPO_PUBLIC_MQTT_USERNAME,
      password: process.env.EXPO_PUBLIC_MQTT_PASSWORD,
      reconnectPeriod: 2000,
    })
    clientRef.current = client

    client.on('connect', () => {
      setStatus('connected')
      client.subscribe('renewvan/#')
    })
    client.on('reconnect', () => setStatus('connecting'))
    client.on('close', () => setStatus('disconnected'))
    client.on('offline', () => setStatus('disconnected'))
    client.on('error', () => setStatus('disconnected'))
    client.on('message', (topic, message) => {
      setState((prev) => applyMessage(prev, topic, message.toString()))
    })

    return () => {
      client.end(true)
      clientRef.current = null
    }
  }, [wsUrl])

  return { state, status }
}
