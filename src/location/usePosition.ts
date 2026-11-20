import * as Location from 'expo-location'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import {
  resolvePosition,
  selectVanGps,
  type PhonePosition,
  type Position,
  type PositionPermission,
  type PositionSource,
} from './position'

export interface PositionState {
  position: Position | null
  source: PositionSource
  status: PositionPermission | null
  /** The only action that can show the system permission prompt. */
  requestPermission: () => Promise<void>
}

/** The van/phone position seam. It has no map, navigation or bus-publishing knowledge. */
export function usePosition(): PositionState {
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
      // Yield once so starting a subscription does not synchronously set state inside the effect.
      await Promise.resolve()
      if (!live) return
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
  return { ...resolved, status, requestPermission }
}
