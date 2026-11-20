import { Droplet, Thermometer } from 'lucide-react-native'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { TankCard } from '@/components/tanks/TankCard'
import { TemperatureCard } from '@/components/temperature/TemperatureCard'
import { TiltCard } from '@/components/start/StartCards'
import { EmptyState } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import { iconKey } from '@/lib/entityIcons'
import { sortTankIds } from '@/lib/tank-display'
import { sortedSensorIds } from '@/lib/temperature'
import { usePreferences } from '@/preferences/PreferencesProvider'
import { useTheme } from '@/theme'
import { isCompleteTank } from '@/types'

/** Drain/fill pace only needs minute resolution. */
const PACE_REFRESH_MS = 30_000

/** One card per tank, fresh first, then grey, then the rest by id. */
export function TanksContent() {
  const { colors } = useTheme()
  const { state, entityIcons } = useRenewvanBus()
  const { tanks } = state
  const now = useNow(PACE_REFRESH_MS)
  // MQTT builds a tank up one property per retained message; skip any id whose record hasn't
  // fully arrived yet (see `isCompleteTank`).
  const ids = sortTankIds(Object.keys(tanks).filter((id) => isCompleteTank(tanks[id])))
  if (ids.length === 0) {
    return (
      <EmptyState
        icon={<Droplet size={20} color={colors.muted} />}
        title="No tank data yet."
        detail="Waiting for readings from the Renewvan hub."
      />
    )
  }
  return (
    <>
      {ids.map((id) => (
        <TankCard key={id} tank={tanks[id]} now={now} icon={entityIcons[iconKey('tank', id)]} />
      ))}
    </>
  )
}

/** One card per temperature sensor; a sensor hidden in Settings is still on the bus but gets no card. */
export function TemperatureContent() {
  const { colors } = useTheme()
  const { state, entityIcons } = useRenewvanBus()
  const { hiddenTemperatures } = usePreferences()
  const sensorIds = sortedSensorIds(state.temperatures).filter(
    (id) => !hiddenTemperatures.includes(id),
  )
  if (sensorIds.length === 0) {
    return (
      <EmptyState
        icon={<Thermometer size={20} color={colors.muted} />}
        title="No temperature sensors yet."
        detail="Waiting for their driver to publish."
      />
    )
  }
  return (
    <>
      {sensorIds.map((id) => (
        <TemperatureCard
          key={id}
          id={id}
          sensor={state.temperatures[id]}
          icon={entityIcons[iconKey('temperature', id)]}
        />
      ))}
    </>
  )
}

/** The tilt sensor's card, which draws its own empty state. */
export function TiltContent() {
  const { state } = useRenewvanBus()
  return <TiltCard tilt={Object.values(state.tilt)[0]} />
}
