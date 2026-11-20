import * as Location from 'expo-location'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import {
  resolvePosition,
  selectVanGps,
  type PhonePosition,
  type PositionPermission,
} from './position'
import { PositionContext } from './usePosition'

/**
 * The one van/phone position for the whole app: a single permission read and a single GPS watch,
 * however many screens read it. It has no map, navigation or bus-publishing knowledge.
 */
export function PositionProvider({ children }: { children: ReactNode }) {
  const { state } = useRenewvanBus()
  const van = selectVanGps(state)
  const [phone, setPhone] = useState<PhonePosition | null>(null)
  const [status, setStatus] = useState<PositionPermission | null>(null)
  const [foreground, setForeground] = useState(AppState.currentState === 'active')

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setForeground(next === 'active')
    })
    return () => subscription.remove()
  }, [])

  // Reading permission never prompts. Re-read after Settings may have changed it.
  useEffect(() => {
    if (!foreground) return
    let live = true
    Location.getForegroundPermissionsAsync()
      .then((next) => {
        if (live) setStatus({ status: next.status, canAskAgain: next.canAskAgain })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [foreground])

  const hasVanPosition = van !== undefined
  const requestPermission = useCallback(async () => {
    if (hasVanPosition) return
    const next = await Location.requestForegroundPermissionsAsync()
    setStatus({ status: next.status, canAskAgain: next.canAskAgain })
  }, [hasVanPosition])

  const canWatch = foreground && !hasVanPosition && status?.status === 'granted'
  useEffect(() => {
    if (!canWatch) return
    let live = true
    let subscription: Location.LocationSubscription | undefined
    const start = async () => {
      // Do not show a stale phone fix from before a van fix or a trip to the background.
      setPhone(null)
      try {
        const next = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
          ({ coords }) => {
            if (live) {
              setPhone({
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: coords.accuracy,
              })
            }
          },
          () => {
            if (live) setPhone(null)
          },
        )
        if (live) subscription = next
        else next.remove()
      } catch {
        if (live) setPhone(null)
      }
    }
    void start()
    return () => {
      live = false
      subscription?.remove()
    }
  }, [canWatch])

  const usablePhone = canWatch ? phone : null
  // Keep the van position referentially stable across unrelated bus messages; VanMap is memoised.
  const resolved = useMemo(() => resolvePosition(van, usablePhone), [van, usablePhone])
  const value = useMemo(
    () => ({ ...resolved, status, requestPermission }),
    [resolved, status, requestPermission],
  )
  return <PositionContext.Provider value={value}>{children}</PositionContext.Provider>
}
