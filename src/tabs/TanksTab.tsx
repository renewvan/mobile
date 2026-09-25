import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { RadialGauge } from '../components/RadialGauge'
import { colors } from '../theme'
import type { Tank } from '../types'

export interface TanksTabProps {
  tanks: Record<string, Tank>
}

const FLUID_LABELS: Record<Tank['fluid_type'], string> = {
  fresh_water: 'Fresh water',
  grey_water: 'Grey water',
  black_water: 'Black water',
  fuel: 'Fuel',
  lpg: 'LPG',
}

const STATUS_LABELS: Record<Tank['status'], string> = {
  ok: 'OK',
  open_circuit: 'Sensor fault: open circuit',
  short_circuit: 'Sensor fault: short circuit',
}

/** Order matters for a stable render: fresh, then grey, then anything else. */
const TANK_ORDER = ['fresh', 'grey']

export function TanksTab({ tanks }: TanksTabProps) {
  const ids = Object.keys(tanks).sort(
    (a, b) => TANK_ORDER.indexOf(a) - TANK_ORDER.indexOf(b) || a.localeCompare(b),
  )

  if (ids.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No tank data yet.</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.grid}>
      {ids.map((id) => {
        const tank = tanks[id]
        const litersRemaining = Math.round((tank.capacity_l * tank.level_pct) / 100)
        const sub =
          tank.status === 'ok'
            ? `${id} · ${litersRemaining}/${tank.capacity_l} L`
            : `${id} · ${STATUS_LABELS[tank.status]}`
        return (
          <RadialGauge
            key={id}
            pct={tank.level_pct}
            label={FLUID_LABELS[tank.fluid_type]}
            sub={sub}
            color={tank.status === 'ok' ? colors.accent : colors.bad}
          />
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, padding: 24, justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textDim },
})
