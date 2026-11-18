import { Droplet } from 'lucide-react-native'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { Screen } from '@/components/Screen'
import { TankCard } from '@/components/tanks/TankCard'
import { EmptyState } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import { iconKey } from '@/lib/entityIcons'
import { sortTankIds } from '@/lib/tank-display'
import { useTheme } from '@/theme'
import { isCompleteTank } from '@/types'

/** Drain/fill pace only needs minute resolution. */
const PACE_REFRESH_MS = 30_000

/** The Tanks tab: one card per tank, fresh first, then grey, then the rest by id. */
export default function TanksTab() {
  const { colors } = useTheme()
  const { state, entityIcons } = useRenewvanBus()
  const { tanks } = state
  const now = useNow(PACE_REFRESH_MS)
  // MQTT builds a tank up one property per retained message; skip any id whose record hasn't
  // fully arrived yet (see `isCompleteTank`).
  const ids = sortTankIds(Object.keys(tanks).filter((id) => isCompleteTank(tanks[id])))

  return (
    <Screen>
      {ids.length === 0 ? (
        <EmptyState
          icon={<Droplet size={20} color={colors.muted} />}
          title="No tank data yet."
          detail="Waiting for readings from the renewvan hub."
        />
      ) : (
        ids.map((id) => (
          <TankCard key={id} tank={tanks[id]} now={now} icon={entityIcons[iconKey('tank', id)]} />
        ))
      )}
    </Screen>
  )
}
