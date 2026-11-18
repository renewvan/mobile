import { Droplet, Heater as HeaterIcon, LayoutGrid, Sun, Waves, Zap } from 'lucide-react-native'
import { memo, useMemo, type ReactNode } from 'react'
import { useCommands } from '@/bus/commands'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { HeaterCard } from '@/components/heater/HeaterCard'
import { VanMap } from '@/components/map/VanMap'
import { NativeButton } from '@/components/native'
import { flowFromBus } from '@/components/power/flowModel'
import { PowerFlow } from '@/components/power/PowerFlow'
import { SOLAR_HISTORY_DAYS, SolarCard } from '@/components/power/SolarCard'
import { Screen } from '@/components/Screen'
import { openSettings } from '@/components/settings/routes'
import { TemperaturesCard, TiltCard } from '@/components/start/StartCards'
import { TankCard } from '@/components/tanks/TankCard'
import { Card, EmptyState, MutedIcon, NoData, TitledCard } from '@/components/ui'
import { useFirstSolarWithHistory } from '@/hooks/useSolarYieldHistory'
import { useNow } from '@/hooks/useNow'
import { heaterDriversOnline } from '@/lib/drivers'
import { iconKey } from '@/lib/entityIcons'
import { usePreferences } from '@/preferences/PreferencesProvider'
import type { StartWidgetId } from '@/preferences/preferences'
import { useTheme } from '@/theme'
import { isCompleteTank, type FluidType, type Tank } from '@/types'

/** Tank levels move slowly; minute resolution is plenty for the severity colour. */
const REFRESH_MS = 30_000

/** The first complete tank of a fluid type, with its bus id; ids are arbitrary, the fluid is the ask. */
function tankOf(tanks: Record<string, Partial<Tank>>, fluid: FluidType) {
  for (const [id, tank] of Object.entries(tanks)) {
    if (isCompleteTank(tank) && tank.fluid_type === fluid) return { id, tank }
  }
  return undefined
}

/**
 * The Start tab: the van at a glance, one widget per reading, stacked as the dashboard stacks
 * them on a phone. Which widgets, and in what order, is this phone's own choice (Settings ›
 * General › Display & Appearance › Widgets). Each widget draws its own empty state, so a van
 * without a heater or a tilt sensor still gets a tidy page.
 *
 * Not here yet, against the dashboard: the weather forecast.
 */
export default function StartTab() {
  const { colors } = useTheme()
  const { state, demoMode, primaryBattery, entityIcons } = useRenewvanBus()
  const commands = useCommands()
  const { startLayout, powerLayout } = usePreferences()
  const now = useNow(REFRESH_MS)
  const { batteries, solar, chargers, tanks, heaters, temperatures, tilt } = state
  const solarRecord = useFirstSolarWithHistory(solar, SOLAR_HISTORY_DAYS)
  const choice = primaryBattery ?? undefined
  const flow = useMemo(
    () => flowFromBus(batteries, solar, chargers, choice),
    [batteries, solar, chargers, choice],
  )

  const tankWidget = (fluid: FluidType, title: string, Icon: typeof Droplet) => {
    const found = tankOf(tanks, fluid)
    return found ? (
      <TankCard tank={found.tank} now={now} icon={entityIcons[iconKey('tank', found.id)]} />
    ) : (
      <TitledCard icon={<MutedIcon icon={Icon} />} title={title}>
        <NoData icon={<MutedIcon icon={Icon} />} label={title} />
      </TitledCard>
    )
  }

  const widget = (id: StartWidgetId): ReactNode => {
    switch (id) {
      case 'temperature':
        return <TemperaturesCard temperatures={temperatures} />
      case 'map':
        // Edge to edge: no title row, no padding. The map is the card.
        return (
          <Card>
            <VanMap variant="card" onExpand={() => openSettings('map')} />
          </Card>
        )
      case 'energy':
        return (
          <TitledCard icon={<MutedIcon icon={Zap} />} title="Energy">
            {flow.nodes.battery.present ? (
              <PowerFlow flow={flow} layout={powerLayout} />
            ) : (
              <NoData icon={<MutedIcon icon={Zap} />} label="Power" />
            )}
          </TitledCard>
        )
      case 'heater': {
        const heaterId = Object.keys(heaters).sort()[0]
        return heaterId === undefined ? (
          <TitledCard icon={<MutedIcon icon={HeaterIcon} />} title="Heater">
            <NoData icon={<MutedIcon icon={HeaterIcon} />} label="Heater" />
          </TitledCard>
        ) : (
          <HeaterCard
            id={heaterId}
            heater={heaters[heaterId]}
            frozen={heaterFrozen}
            commands={commands}
            variant="widget"
          />
        )
      }
      case 'solar': {
        // No card until a controller publishes: there is nothing to say about solar a van lacks.
        const record = solarRecord
        return record ? (
          <TitledCard icon={<MutedIcon icon={Sun} />} title="Solar production">
            <SolarCard solar={record} />
          </TitledCard>
        ) : null
      }
      case 'tilt':
        return <TiltCard tilt={Object.values(tilt)[0]} />
      case 'fresh-water':
        return tankWidget('fresh_water', 'Fresh water', Droplet)
      case 'grey-water':
        return tankWidget('grey_water', 'Grey water', Waves)
    }
  }

  // What each widget draws from. A widget re-renders only when one of these changes, not on every
  // bus message: the van reports several readings a second, and re-rendering all eight widgets for
  // each one kept the JS thread busy. `colors` changes with the theme.
  const heaterFrozen = demoMode || !heaterDriversOnline(state)
  const inputsOf = (id: StartWidgetId): readonly unknown[] => {
    switch (id) {
      case 'temperature':
        return [colors, temperatures]
      case 'map':
        return [colors]
      case 'energy':
        return [colors, flow, powerLayout]
      case 'heater':
        return [colors, heaters, heaterFrozen, commands]
      case 'solar':
        return [colors, solarRecord]
      case 'tilt':
        return [colors, tilt]
      case 'fresh-water':
      case 'grey-water':
        return [colors, tanks, now, entityIcons]
    }
  }

  return (
    <Screen>
      {startLayout.length === 0 ? (
        <>
          <EmptyState
            icon={<LayoutGrid size={20} color={colors.muted} />}
            title="No widgets on the Start tab."
            detail="Choose what to show here in Settings."
          />
          <NativeButton label="Choose widgets" onPress={() => openSettings('widgets')} />
        </>
      ) : (
        startLayout.map((id) => (
          <WidgetSlot key={id} inputs={inputsOf(id)} render={() => widget(id)} />
        ))
      )}
    </Screen>
  )
}

/**
 * One widget, keyed by its id so reordering moves cards instead of rebuilding them. It draws again
 * only when one of its `inputs` changes (compared one by one); `render` is ignored for that.
 */
const WidgetSlot = memo(
  function WidgetSlot({ render }: { inputs: readonly unknown[]; render: () => ReactNode }) {
    return <>{render()}</>
  },
  (prev, next) =>
    prev.inputs.length === next.inputs.length &&
    prev.inputs.every((input, index) => Object.is(input, next.inputs[index])),
)
