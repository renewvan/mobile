import { Sun, Zap } from 'lucide-react-native'
import { useMemo } from 'react'
import { Text } from 'react-native'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { flowFromBus } from '@/components/power/flowModel'
import { PowerFlow } from '@/components/power/PowerFlow'
import { SolarCard } from '@/components/power/SolarCard'
import { Screen } from '@/components/Screen'
import { NoData, TitledCard } from '@/components/ui'
import { firstSolar } from '@/components/widgets/solar/solarView'
import { completeBatteryIds, primaryBattery } from '@/lib/primaryBattery'
import { usePreferences } from '@/preferences/PreferencesProvider'
import { useTheme } from '@/theme'

/**
 * The Power tab: where the power comes from and goes (solar, alternator and shore charger into
 * the battery, out to the loads), then the solar controller's harvest. Which battery it reads is
 * the shared Primary battery choice on the bus, so it agrees with the dashboard.
 */
export default function PowerTab() {
  const { colors } = useTheme()
  const { state, primaryBattery: selection } = useRenewvanBus()
  const { powerLayout } = usePreferences()
  const { batteries, solar, chargers } = state
  const choice = selection ?? undefined
  const flow = useMemo(
    () => flowFromBus(batteries, solar, chargers, choice),
    [batteries, solar, chargers, choice],
  )
  const primary = primaryBattery(batteries, choice)
  // With more than one battery, say which one the diagram reads.
  const namesSource = completeBatteryIds(batteries).length > 1 && primary !== undefined
  const solarRecord = firstSolar(solar)

  return (
    <Screen>
      <TitledCard icon={<Zap size={16} color={colors.muted} />} title="Power">
        {flow.nodes.battery.present ? (
          <>
            <PowerFlow flow={flow} layout={powerLayout} />
            {namesSource && (
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>
                Battery: {primary.battery.name ?? primary.id}
              </Text>
            )}
          </>
        ) : (
          <NoData icon={<Zap size={16} color={colors.muted} />} label="Power" />
        )}
      </TitledCard>
      {solarRecord && (
        <TitledCard icon={<Sun size={16} color={colors.muted} />} title="Solar production">
          <SolarCard solar={solarRecord} />
        </TitledCard>
      )}
    </Screen>
  )
}
