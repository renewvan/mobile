import { Heater as HeaterIcon } from 'lucide-react-native'
import { StyleSheet, Text } from 'react-native'
import { useCommands } from '@/bus/commands'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { HeaterCard } from '@/components/heater/HeaterCard'
import { Screen } from '@/components/Screen'
import { TemperatureCard } from '@/components/temperature/TemperatureCard'
import { Banner, EmptyState } from '@/components/ui'
import { heaterDriversOnline } from '@/lib/drivers'
import { iconKey } from '@/lib/entityIcons'
import { sortedSensorIds } from '@/lib/temperature'
import { usePreferences } from '@/preferences/PreferencesProvider'
import { useTheme } from '@/theme'

/**
 * The Climate tab: the dashboard's Heater page, then its Temperature page. They share a tab
 * because Android's tab bar holds five and the dashboard has more pages than that; a heater and
 * the temperatures it works on belong together anyway.
 */
export default function ClimateTab() {
  const { colors } = useTheme()
  const { state, demoMode, entityIcons } = useRenewvanBus()
  const commands = useCommands()
  const heaterIds = Object.keys(state.heaters).sort()
  const { hiddenTemperatures } = usePreferences()
  // A sensor hidden in Settings is still on the bus; it just gets no card here.
  const sensorIds = sortedSensorIds(state.temperatures).filter(
    (id) => !hiddenTemperatures.includes(id),
  )
  const driverOnline = heaterDriversOnline(state)
  const frozen = demoMode || !driverOnline

  if (heaterIds.length === 0 && sensorIds.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon={<HeaterIcon size={20} color={colors.muted} />}
          title="No heater or temperature sensors yet."
          detail="Waiting for their drivers to publish."
        />
      </Screen>
    )
  }

  return (
    <Screen>
      {heaterIds.length > 0 &&
        (demoMode ? (
          <Banner>Demo mode: controls are disabled.</Banner>
        ) : !driverOnline ? (
          <Banner>
            The heater driver is not online. The heater is unknown and its controls are disabled.
          </Banner>
        ) : null)}
      {heaterIds.map((id) => (
        <HeaterCard
          key={id}
          id={id}
          heater={state.heaters[id]}
          frozen={frozen}
          commands={commands}
        />
      ))}
      {sensorIds.length > 0 && heaterIds.length > 0 && (
        <Text accessibilityRole="header" style={[styles.section, { color: colors.muted }]}>
          Temperatures
        </Text>
      )}
      {sensorIds.map((id) => (
        <TemperatureCard
          key={id}
          id={id}
          sensor={state.temperatures[id]}
          icon={entityIcons[iconKey('temperature', id)]}
        />
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  section: { fontSize: 14, fontWeight: '500', marginTop: 8, marginLeft: 4 },
})
