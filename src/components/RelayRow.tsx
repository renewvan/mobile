import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme'

export interface RelayRowProps {
  label: string
  state: boolean
}

/**
 * A single read-only relay row: label + on/off indicator. No tap-to-toggle
 * — `relay` has no command topic in v0
 * (hub/.scratch/renewvan-hub-v0-build/issues/07-dashboard-phone-app.md).
 */
export function RelayRow({ label, state }: RelayRowProps) {
  return (
    <View style={styles.row} testID="relay-row">
      <Text style={styles.label}>{label}</Text>
      <View
        style={[styles.indicator, state && styles.indicatorOn]}
        accessibilityRole="text"
        accessibilityLabel={state ? 'on' : 'off'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { color: colors.text, fontSize: 16 },
  indicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  indicatorOn: {
    backgroundColor: colors.ok,
    borderColor: colors.ok,
  },
})
