import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { RelayRow } from '../components/RelayRow'
import { relayLabel } from '../config/relayLabels'
import { colors } from '../theme'
import type { Relay } from '../types'

export interface SwitchesTabProps {
  relays: Record<string, Relay>
}

export function SwitchesTab({ relays }: SwitchesTabProps) {
  const ids = Object.keys(relays).sort()

  if (ids.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No relay data yet.</Text>
      </View>
    )
  }

  return (
    <ScrollView>
      {ids.map((id) => (
        <RelayRow key={id} label={relayLabel(id)} state={relays[id].state} />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textDim },
})
