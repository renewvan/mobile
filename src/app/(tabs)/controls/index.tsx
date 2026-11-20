import { ToggleLeft } from 'lucide-react-native'
import { useCommands } from '@/bus/commands'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { HeaterCard } from '@/components/heater/HeaterCard'
import { RelayPanels } from '@/components/relays/RelayPanels'
import { Screen } from '@/components/Screen'
import { Banner, EmptyState } from '@/components/ui'
import { heaterDriversOnline, relayDriversOnline } from '@/lib/drivers'
import { useTheme } from '@/theme'

/** The Controls tab: the heater, then every relay channel on the bus, grouped as the owner grouped them in Settings. */
export default function ControlsTab() {
  const { colors } = useTheme()
  const { state, demoMode, relayGroups, relayGroupList, relayOrder, entityIcons } = useRenewvanBus()
  const commands = useCommands()
  const { setRelay } = commands
  const heaterIds = Object.keys(state.heaters).sort()
  const heaterDriverOnline = heaterDriversOnline(state)
  const heaterFrozen = demoMode || !heaterDriverOnline

  return (
    <Screen>
      {heaterIds.length > 0 &&
        (demoMode ? (
          <Banner>Demo mode: controls are disabled.</Banner>
        ) : !heaterDriverOnline ? (
          <Banner>
            The heater driver is not online. The heater is unknown and its controls are disabled.
          </Banner>
        ) : null)}
      {heaterIds.map((id) => (
        <HeaterCard
          key={id}
          id={id}
          heater={state.heaters[id]}
          frozen={heaterFrozen}
          commands={commands}
        />
      ))}
      {Object.keys(state.relays).length === 0 ? (
        heaterIds.length > 0 ? null : (
          <EmptyState
            icon={<ToggleLeft size={20} color={colors.muted} />}
            title="No relays yet."
            detail="Waiting for the relay driver to publish."
          />
        )
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
      )}
    </Screen>
  )
}
