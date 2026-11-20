import { Heater as HeaterIcon, ToggleLeft } from 'lucide-react-native'
import { useCommands } from '@/bus/commands'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { controlsSections } from '@/components/controls/sections'
import { HeaterCard } from '@/components/heater/HeaterCard'
import { RelayPanels } from '@/components/relays/RelayPanels'
import { Screen } from '@/components/Screen'
import { Banner, EmptyState, NoData, TitledCard } from '@/components/ui'
import { useCapabilities } from '@/hooks/useCapabilities'
import { heaterDriversOnline, relayDriversOnline } from '@/lib/drivers'
import { useTheme } from '@/theme'

/** The Controls tab: the heater, then every relay channel on the bus, grouped as the owner grouped them in Settings. */
export default function ControlsTab() {
  const { colors } = useTheme()
  const { state, demoMode, relayGroups, relayGroupList, relayOrder, entityIcons } = useRenewvanBus()
  const commands = useCommands()
  const capabilities = useCapabilities()
  const { setRelay } = commands
  const sections = controlsSections(capabilities)
  const hasHeater = sections.includes('heater')
  const hasRelays = sections.includes('relays')
  const loading = capabilities.heater.state === 'loading' || capabilities.relay.state === 'loading'
  const heaterIds = Object.keys(state.heaters).sort()
  const heaterDriverOnline = heaterDriversOnline(state)
  const heaterFrozen = demoMode || !heaterDriverOnline

  if (sections.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon={<ToggleLeft size={20} color={colors.muted} />}
          title={loading ? 'Loading controls…' : 'No controls on this van.'}
          detail={
            loading
              ? 'Looking for heaters and relays.'
              : 'Heater and relay controls appear here when their drivers are installed.'
          }
        />
      </Screen>
    )
  }

  return (
    <Screen>
      {hasHeater &&
        (demoMode ? (
          <Banner>Demo mode: controls are disabled.</Banner>
        ) : !heaterDriverOnline ? (
          <Banner>
            The heater driver is not online. The heater is unknown and its controls are disabled.
          </Banner>
        ) : null)}
      {hasHeater &&
        (heaterIds.length === 0 ? (
          <TitledCard icon={<HeaterIcon size={16} color={colors.muted} />} title="Heater">
            <NoData icon={<HeaterIcon size={16} color={colors.muted} />} label="Heater" />
          </TitledCard>
        ) : (
          heaterIds.map((id) => (
            <HeaterCard
              key={id}
              id={id}
              heater={state.heaters[id]}
              frozen={heaterFrozen}
              commands={commands}
            />
          ))
        ))}
      {hasRelays &&
        (Object.keys(state.relays).length === 0 ? (
          <TitledCard icon={<ToggleLeft size={16} color={colors.muted} />} title="Relays">
            <NoData icon={<ToggleLeft size={16} color={colors.muted} />} label="Relays" />
          </TitledCard>
        ) : (
          <RelayPanels
            relays={state.relays}
            driverOnline={relayDriversOnline(state)}
            demo={demoMode}
            onSetRelay={setRelay}
            groups={relayGroups}
            groupList={relayGroupList ?? undefined}
            order={relayOrder}
            icons={entityIcons}
          />
        ))}
    </Screen>
  )
}
