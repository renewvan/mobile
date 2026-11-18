import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { usePreferences } from '@/preferences/PreferencesProvider'
import { useSession } from '@/session/SessionProvider'
import { desiredAlerts, parseAlertLog, reconcile, type AlertEntry } from './alertLog'
import { dismissAlert, notifyAlert, useOpenAlertsOnTap } from './notifications'

// The alert log, kept on the phone and kept current from the bus: the dashboard's alert history
// (`useAlertToasts` + `useAlertHistory`) as one provider. What an alert is and when it opens or
// resolves is `alertLog.ts`; this is the state, the storage and the notifications around it.

const STORAGE_KEY = 'renewvan.alertHistory.v1'

/** How long the retained state is given to arrive after a connect before absence means "cleared". */
const SETTLE_MS = 3000

interface AlertsValue {
  /** Newest first. */
  entries: AlertEntry[]
  /** Alerts whose condition still holds. */
  openCount: number
  /** Deletes one resolved alert; an open one would only be raised again at once. */
  remove: (id: string) => void
  /** Deletes every resolved alert. */
  clearResolved: () => void
}

/** The log changes only here: set whole by the bus diff or the stored copy, or pruned by the user. */
type Action =
  | { type: 'set'; entries: AlertEntry[] }
  | { type: 'remove'; id: string }
  | { type: 'clearResolved' }

function logReducer(entries: AlertEntry[], action: Action): AlertEntry[] {
  switch (action.type) {
    case 'set':
      return action.entries
    case 'remove':
      return entries.filter((e) => e.id !== action.id || e.resolvedAt === undefined)
    case 'clearResolved':
      return entries.filter((e) => e.resolvedAt === undefined)
  }
}

const AlertsContext = createContext<AlertsValue | null>(null)

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { state, status, tailscale, demoMode } = useRenewvanBus()
  const { connection } = useSession()
  const { alertsEnabled } = usePreferences()
  const [entries, dispatch] = useReducer(logReducer, [])
  const [loaded, setLoaded] = useState(false)
  const [settled, setSettled] = useState(false)
  useOpenAlertsOnTap()

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => dispatch({ type: 'set', entries: parseAlertLog(raw) }))
      // A log that cannot be read starts empty for this run.
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {})
  }, [entries, loaded])

  useEffect(() => {
    if (status !== 'connected') return
    const timer = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => {
      clearTimeout(timer)
      setSettled(false)
    }
  }, [status])

  // Every render: it is a cheap diff that changes nothing (and returns the same array) unless an
  // alert opened or resolved. Signed out there is no van to raise alerts about.
  useEffect(() => {
    if (!loaded || connection === null) return
    const desired = desiredAlerts({ state, status, tailscale, demo: demoMode })
    const flags = { connecting: status === 'connecting', settled, demo: demoMode }
    const next = reconcile(entries, desired, flags, Date.now())
    if (next.entries === entries) return
    dispatch({ type: 'set', entries: next.entries })
    for (const entry of next.resolved) dismissAlert(entry).catch(() => {})
    if (alertsEnabled) for (const entry of next.opened) notifyAlert(entry).catch(() => {})
  })

  const value = useMemo<AlertsValue>(
    () => ({
      entries,
      openCount: entries.filter((e) => e.resolvedAt === undefined).length,
      remove: (id) => dispatch({ type: 'remove', id }),
      clearResolved: () => dispatch({ type: 'clearResolved' }),
    }),
    [entries],
  )
  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
}

export function useAlerts(): AlertsValue {
  const value = useContext(AlertsContext)
  if (value === null) throw new Error('useAlerts needs an AlertsProvider above it')
  return value
}
