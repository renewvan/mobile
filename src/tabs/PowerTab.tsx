import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { RadialGauge } from '../components/RadialGauge'
import { colors } from '../theme'
import { isCompleteBattery, type Battery } from '../types'

export interface PowerTabProps {
  batteries: Record<string, Battery>
}

export function PowerTab({ batteries }: PowerTabProps) {
  // MQTT builds a battery up one property per retained message; skip any
  // id whose record hasn't fully arrived yet instead of crashing on the
  // still-missing fields (see `isCompleteBattery`).
  const ids = Object.keys(batteries)
    .filter((id) => isCompleteBattery(batteries[id]))
    .sort()

  if (ids.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No battery data yet.</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.grid}>
      {ids.map((id) => {
        const battery = batteries[id]
        const sign = battery.current_a > 0 ? '+' : ''
        return (
          <View key={id} style={styles.card} testID="power-card">
            <RadialGauge pct={battery.soc_pct} label={`Battery (${id})`} color={colors.ok} />
            <Text style={styles.readout}>
              {battery.voltage_v.toFixed(1)} V · {sign}
              {battery.current_a.toFixed(1)} A · {battery.power_w.toFixed(0)} W ·{' '}
              {battery.temperature_c.toFixed(0)}°C
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{battery.charge_state}</Text>
            </View>
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  grid: { gap: 24, padding: 24, alignItems: 'center' },
  card: { alignItems: 'center', gap: 8 },
  readout: { color: colors.textDim, fontSize: 13, textAlign: 'center' },
  badge: {
    backgroundColor: colors.panel2,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.ok,
  },
  badgeText: { color: colors.ok, fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textDim },
})
