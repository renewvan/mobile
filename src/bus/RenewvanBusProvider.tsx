import mqtt, { type MqttClient } from 'mqtt'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { BrokerConfig } from '@/session/hubClient'
import type { RenewvanBusState } from '@/types'
import {
  commandAllowed,
  emptyBusData,
  reduceBusMessage,
  REAL_ROOT,
  visibleState,
  type BusData,
} from './reducer'

// The connection half of the bus adapter: one MQTT-over-WebSocket client for the whole app,
// subscribed to `renewvan/#`. Every topic is retained, so a fresh connection shows real state at
// once. What each message does to the state lives in `reducer.ts`.

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface RenewvanBus extends Omit<BusData, 'real' | 'demo'> {
  /** The van on screen: the simulated one while Demo mode is on. */
  state: RenewvanBusState
  status: ConnectionStatus
  /** Sends a command (QoS 1, never retained). Held back while Demo mode is on. */
  publish: (topic: string, payload: string) => void
}

const BusContext = createContext<RenewvanBus | null>(null)

/**
 * A fresh connection delivers every retained topic in one burst (several hundred messages), and a
 * running van adds a few per second. They are folded into one state update per flush, so a burst
 * renders once, not once per message. A quarter second keeps readings live while holding a busy
 * van to about four renders a second; at 80 ms the live power flow re-rendered the Start tab
 * nearly every frame the JS thread had.
 */
const FLUSH_MS = 250

export function RenewvanBusProvider({
  config,
  children,
}: {
  config: BrokerConfig | null
  children: ReactNode
}) {
  const [data, setData] = useState<BusData>(emptyBusData)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const clientRef = useRef<MqttClient | null>(null)
  // The latest Demo mode flag, for `publish`, which must stay one stable function.
  const demoRef = useRef(false)
  useEffect(() => {
    demoRef.current = data.demoMode
  }, [data.demoMode])

  const url = config?.url
  const username = config?.username
  const password = config?.password

  useEffect(() => {
    // No van: nothing to connect to. The status below reads disconnected without being told.
    if (!url) return
    let disposed = false
    let queue: [topic: string, payload: string][] = []
    let timer: ReturnType<typeof setTimeout> | null = null

    const flush = () => {
      timer = null
      if (disposed || queue.length === 0) return
      const batch = queue
      queue = []
      setData((prev) =>
        batch.reduce((next, [topic, payload]) => reduceBusMessage(next, topic, payload), prev),
      )
    }

    const client = mqtt.connect(url, { username, password, reconnectPeriod: 2000 })
    clientRef.current = client

    const onStatus = (next: ConnectionStatus) => () => {
      if (!disposed) setStatus(next)
    }
    client.on('connect', () => {
      if (disposed) return
      setStatus('connected')
      // One wildcard: `renewvan/#` already covers `renewvan/demo/#`.
      client.subscribe(`${REAL_ROOT}/#`)
    })
    client.on('reconnect', onStatus('connecting'))
    client.on('close', onStatus('disconnected'))
    client.on('offline', onStatus('disconnected'))
    client.on('error', onStatus('disconnected'))
    client.on('message', (topic, message) => {
      if (disposed) return
      queue.push([topic, message.toString()])
      if (timer === null) timer = setTimeout(flush, FLUSH_MS)
    })

    return () => {
      disposed = true
      if (timer !== null) clearTimeout(timer)
      client.end(true)
      clientRef.current = null
      // Another van, or signed out: nothing of the last one may stay on screen.
      setData(emptyBusData)
      setStatus('connecting')
    }
  }, [url, username, password])

  const publish = useCallback((topic: string, payload: string) => {
    if (!commandAllowed(demoRef.current, topic)) return
    clientRef.current?.publish(topic, payload, { qos: 1, retain: false })
  }, [])

  const value = useMemo<RenewvanBus>(() => {
    const { real: _real, demo: _demo, ...shared } = data
    return {
      ...shared,
      state: visibleState(data),
      status: url ? status : 'disconnected',
      publish,
    }
  }, [data, status, publish, url])

  return <BusContext.Provider value={value}>{children}</BusContext.Provider>
}

export function useRenewvanBus(): RenewvanBus {
  const bus = useContext(BusContext)
  if (bus === null) throw new Error('useRenewvanBus needs a RenewvanBusProvider above it')
  return bus
}
