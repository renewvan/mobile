import { PlugZap } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { NoData, TitledCard, tabular } from '@/components/ui'
import { chargerWatts } from '@/lib/charging'
import { useTheme } from '@/theme'
import { isCompleteCharger, type Charger } from '@/types'
import { formatPower } from './flowModel'

/** Every charger on the bus, including one on a van with no battery monitor. */
export function ChargerCard({ chargers }: { chargers: Record<string, Partial<Charger>> }) {
  const { colors } = useTheme()
  const ids = Object.keys(chargers).sort()
  return (
    <TitledCard icon={<PlugZap size={16} color={colors.muted} />} title="Chargers">
      {ids.length === 0 ? (
        <NoData icon={<PlugZap size={16} color={colors.muted} />} label="Chargers" />
      ) : (
        ids.map((id) => {
          const charger = chargers[id]
          const watts = isCompleteCharger(charger) ? chargerWatts(charger) : undefined
          const power = formatPower(watts === undefined ? undefined : Math.round(watts))
          return (
            <View key={id} style={styles.row}>
              <Text numberOfLines={1} style={[styles.name, { color: colors.foreground }]}>
                {charger.name ?? id}
              </Text>
              <Text style={{ color: colors.muted, ...tabular }}>
                {power.value} {power.unit}
              </Text>
            </View>
          )
        })
      )}
    </TitledCard>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  name: { flexShrink: 1, fontSize: 14, fontWeight: '500' },
})
