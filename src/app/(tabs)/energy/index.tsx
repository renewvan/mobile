import { Sun, Zap } from 'lucide-react-native'
import { useMemo } from 'react'
import { Text } from 'react-native'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { ChargerCard } from '@/components/power/ChargerCard'
import { flowFromBus } from '@/components/power/flowModel'
import { PowerFlow } from '@/components/power/PowerFlow'
import { SOLAR_HISTORY_DAYS, SolarCard } from '@/components/power/SolarCard'
import { Screen } from '@/components/Screen'
import { EmptyState, NoData, TitledCard } from '@/components/ui'
import { useCapabilities } from '@/hooks/useCapabilities'
import { useFirstSolarWithHistory } from '@/hooks/useSolarYieldHistory'
import { completeBatteryIds, primaryBattery } from '@/lib/primaryBattery'
import { usePreferences } from '@/preferences/PreferencesProvider'
import { useTheme } from '@/theme'

/**
 * The Energy tab: the power flow when a battery exists, the solar controller's harvest and every
 * charger. Which battery the flow reads is the shared Primary battery choice on the bus, so it
 * agrees with the dashboard.
 */
export default function PowerTab() {
  const { colors } = useTheme()
  const { state, primaryBattery: selection } = useRenewvanBus()
  const { powerLayout } = usePreferences()
  const capabilities = useCapabilities()
  const { batteries, solar, chargers } = state
  const hasBattery = capabilities.battery.state === 'present'
  const hasSolar = capabilities.solar.state === 'present'
  const hasCharger = capabilities.charger.state === 'present'
  const loading = [capabilities.battery, capabilities.solar, capabilities.charger].some(
    (capability) => capability.state === 'loading',
  )
  const choice = selection ?? undefined
  const flow = useMemo(
    () => flowFromBus(batteries, solar, chargers, choice),
    [batteries, solar, chargers, choice],
  )
  const primary = primaryBattery(batteries, choice)
  // With more than one battery, say which one the diagram reads.
  const namesSource = completeBatteryIds(batteries).length > 1 && primary !== undefined
  const solarRecord = useFirstSolarWithHistory(solar, SOLAR_HISTORY_DAYS)

  if (!hasBattery && !hasSolar && !hasCharger) {
    return (
      <Screen>
        <EmptyState
          icon={<Zap size={20} color={colors.muted} />}
          title={loading ? 'Loading energy…' : 'No energy devices on this van.'}
          detail={
            loading
              ? 'Looking for batteries, solar controllers and chargers.'
              : 'Battery, solar and charger readings appear here when their drivers are installed.'
          }
        />
      </Screen>
    )
  }

  return (
    <Screen>
      {hasBattery && (
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
      )}
      {hasSolar && (
        <TitledCard icon={<Sun size={16} color={colors.muted} />} title="Solar production">
          {solarRecord ? (
            <SolarCard solar={solarRecord} />
          ) : (
            <NoData icon={<Sun size={16} color={colors.muted} />} label="Solar production" />
          )}
        </TitledCard>
      )}
      {hasCharger && <ChargerCard chargers={chargers} />}
    </Screen>
  )
}
