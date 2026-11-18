import { ToggleLeft } from 'lucide-react-native'
import { useCommands } from '@/bus/commands'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { RelayPanels } from '@/components/relays/RelayPanels'
import { Screen } from '@/components/Screen'
import { EmptyState } from '@/components/ui'
import { relayDriversOnline } from '@/lib/drivers'
import { useTheme } from '@/theme'

/** The Relays tab: every relay channel on the bus, grouped as the owner grouped them in Settings. */
export default function RelaysTab() {
  const { colors } = useTheme()
  const { state, demoMode, relayGroups, relayGroupList, relayOrder, entityIcons } = useRenewvanBus()
  const { setRelay } = useCommands()

  return (
    <Screen>
      {Object.keys(state.relays).length === 0 ? (
        <EmptyState
          icon={<ToggleLeft size={20} color={colors.muted} />}
          title="No relays yet."
          detail="Waiting for the relay driver to publish."
        />
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
