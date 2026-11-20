/**
 * PROTOTYPE, throwaway (wayfinder ticket "Navigation concept: stable sections and widget
 * drill-down"). Not production code: do not merge to main. Open it from the PROTOTYPE button on the
 * Start tab, or `renewvan://prototype-nav?variant=B`.
 *
 * One question: what does the navigation look like once it no longer changes with the van's drivers?
 * Three structurally different answers on one route, switched with `?variant=` or the bar at the top:
 *   A  Venus: five stable tabs, uniform tiles on Start, every tile drills down, tiles never hide.
 *   B  Cards: three tabs, Alerts and Settings in the header, Start keeps today's full-width cards.
 * Levels (tanks, temperature, tilt) is D's fourth section; automation lives in Settings for now.
 * Energy is a permanent section in every variant (the van's most important one).
 *   F  D with a native-style bar: equal tabs, Van icon in the middle slot, nothing raised.
 *   E  C with Alerts out of the bar: a bell in the header, Settings its own tab, no More.
 *   D  Van centre: a raised centre tab (lucide Van), logo + bell header, E's purpose sections.
 *   C  Purpose: Home groups tiles by purpose (Power, Water, Climate, Locate); a section header drills in.
 *
 * Real bus data and the real cards are reused for the drill-down pages. The tab bars are drawn in JS
 * here only because a prototype must switch layouts at runtime; production would use NativeTabs.
 * "Empty van" simulates a van with no drivers installed to judge the empty states.
 */
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Flame,
  Gauge,
  House,
  MapPin,
  Move3d,
  Plug,
  Settings as SettingsIcon,
  Sun,
  Thermometer,
  ToggleLeft,
  Wifi,
  Zap,
  Ellipsis,
  BatteryMedium,
  Van,
  Waves,
  type LucideIcon,
} from 'lucide-react-native'
import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useAlerts } from '@/alerts/AlertsProvider'
import { useCommands } from '@/bus/commands'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { HeaterCard } from '@/components/heater/HeaterCard'
import { VanMap } from '@/components/map/VanMap'
import { RelayPanels } from '@/components/relays/RelayPanels'
import { Screen } from '@/components/Screen'
import { openSettings } from '@/components/settings/routes'
import { LogoLockup } from '@/components/Logo'
import { Card, EmptyState } from '@/components/ui'
import { heaterDriversOnline, relayDriversOnline } from '@/lib/drivers'
import { formatTemperature, INDOOR_ID, OUTDOOR_ID, sortedSensorIds } from '@/lib/temperature'
import { iconKey } from '@/lib/entityIcons'
import { TemperatureCard } from '@/components/temperature/TemperatureCard'
import { formatTimeToGo } from '@/lib/time-to-go'
import { formatDeg, tiltReading } from '@/lib/tilt'
import { emptyRenewvanBusState } from '@/types'
import { alpha, layout, radius, useTheme } from '@/theme'
import ClimateTab from './(tabs)/climate'
import PowerTab from './(tabs)/power'
import StartTab from './(tabs)/index'
import TanksTab from './(tabs)/tanks'
import { TiltCard } from '@/components/start/StartCards'

// ---------------------------------------------------------------------------------------------
// Data: one tile per entity type, derived from the bus (the real derivation is ticket #20)
// ---------------------------------------------------------------------------------------------

type EntityKey =
  | 'battery'
  | 'solar'
  | 'charger'
  | 'tank'
  | 'relay'
  | 'heater'
  | 'temperature'
  | 'tilt'
  | 'gps'
  | 'router'

interface Tile {
  key: EntityKey
  title: string
  icon: LucideIcon
  /** The status-first line: one value. */
  value: string
  sub?: string
  present: boolean
}

function useTiles(empty: boolean): Record<EntityKey, Tile> {
  const { state } = useRenewvanBus()
  const s = empty ? emptyRenewvanBusState : state
  const first = <T,>(r: Record<string, T>): T | undefined => Object.values(r)[0]
  const battery = first(s.batteries)
  const solarW = Object.values(s.solar).reduce((sum, x) => sum + (x.power_w ?? 0), 0)
  const relays = Object.values(s.relays)
  const heater = first(s.heaters)
  const router = first(s.routers)
  const gps = first(s.gps)
  const tilt = tiltReading(first(s.tilt))
  const none = 'Not installed'
  const t = (
    key: EntityKey,
    title: string,
    icon: LucideIcon,
    present: boolean,
    value: string,
    sub?: string,
  ): [EntityKey, Tile] => [key, { key, title, icon, present, value: present ? value : none, sub: present ? sub : undefined }]
  return Object.fromEntries([
    t('battery', 'Battery', BatteryMedium, battery !== undefined, battery?.soc_pct === undefined ? '…' : `${Math.round(battery.soc_pct)}%`, battery?.voltage_v === undefined ? undefined : `${battery.voltage_v.toFixed(1)} V`),
    t('solar', 'Solar', Sun, Object.keys(s.solar).length > 0, `${Math.round(solarW)} W`, 'now'),
    t('charger', 'Chargers', Plug, Object.keys(s.chargers).length > 0, `${Object.keys(s.chargers).length}`, 'alternator / shore'),
    t('tank', 'Water', Droplet, Object.keys(s.tanks).length > 0, `${Object.keys(s.tanks).length} tanks`, 'fresh and grey'),
    t('relay', 'Relays', ToggleLeft, relays.length > 0, `${relays.filter((r) => r.state).length}/${relays.length} on`),
    t('heater', 'Heater', Flame, heater !== undefined, heater?.phase ?? 'unknown', heater?.setpoint_c === undefined ? undefined : `${heater.setpoint_c} °C`),
    t('temperature', 'Temperature', Thermometer, Object.keys(s.temperatures).length > 0, formatTemperature(s.temperatures[OUTDOOR_ID]), `inside ${formatTemperature(s.temperatures[INDOOR_ID])}`),
    t('tilt', 'Tilt', Move3d, Object.keys(s.tilt).length > 0, tilt.pitch === null ? '–' : formatDeg(tilt.pitch), 'pitch'),
    t('gps', 'Position', MapPin, Object.keys(s.gps).length > 0, gps && 'fix_quality' in gps ? String(gps.fix_quality).replace('_', ' ') : '…'),
    t('router', 'Router', Wifi, router !== undefined, router?.signal_rsrp_dbm === undefined ? '…' : `${router.signal_rsrp_dbm} dBm`, 'LTE signal'),
  ]) as Record<EntityKey, Tile>
}

// ---------------------------------------------------------------------------------------------
// Shared bits: tile, drill-down page, controls page, map page, empty explanations
// ---------------------------------------------------------------------------------------------

function TileView({ tile, onPress, wide }: { tile: Tile; onPress: () => void; wide?: boolean }) {
  const { colors } = useTheme()
  const Icon = tile.icon
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.tile,
        { backgroundColor: colors.surface, opacity: tile.present ? 1 : 0.55 },
        wide ? styles.tileWide : null,
      ]}
    >
      <Icon size={18} color={tile.present ? colors.accent : colors.muted} />
      <Text style={{ color: colors.muted, fontSize: 12 }}>{tile.title}</Text>
      <Text style={{ color: colors.foreground, fontSize: tile.present ? 20 : 14, fontWeight: '600' }}>
        {tile.value}
      </Text>
      {tile.sub ? <Text style={{ color: colors.muted, fontSize: 12 }}>{tile.sub}</Text> : null}
    </Pressable>
  )
}

/** What a drill-down target shows: the real page for this entity type, today's screens reused. */
function DrillPage({ type, empty }: { type: EntityKey; empty: boolean }) {
  const { colors } = useTheme()
  const { state } = useRenewvanBus()
  if (type === 'gps') return <MapPage empty={empty} />
  if (empty) return <Explain icon={Zap} title="Not installed on this van." detail="A driver for this will show up here by itself. No app update needed." />
  switch (type) {
    case 'battery':
    case 'solar':
    case 'charger':
      return <EnergyPage empty={false} />
    case 'tank':
      return <TanksTab />
    case 'heater':
    case 'temperature':
      return <ClimateTab />
    case 'relay':
      return <ControlsPage empty={false} />
    case 'tilt':
      return (
        <Screen>
          <TiltCard tilt={Object.values(state.tilt)[0]} />
        </Screen>
      )
    case 'router':
      return (
        <Screen>
          <Card>
            <Text style={{ color: colors.foreground, padding: 16 }}>
              Router: today this lives in Settings › Connectivity. Stays there, or becomes this page.
            </Text>
          </Card>
          <Pressable onPress={() => openSettings('connectivity')}>
            <Text style={{ color: colors.accent, padding: 16 }}>Open Settings › Connectivity</Text>
          </Pressable>
        </Screen>
      )
  }
}

function Explain({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  const { colors } = useTheme()
  return (
    <Screen>
      <EmptyState icon={<Icon size={20} color={colors.muted} />} title={title} detail={detail} />
    </Screen>
  )
}

const ENERGY: EntityKey[] = ['battery', 'solar', 'charger']

/**
 * Energy: a permanent section, the van's most important one. Summary first (state of charge, time to
 * go, what comes in), then the real power-flow diagram, solar and history from today's Power tab.
 * MOCK: net power, "last 7 days" and the consumption split would come from history on the hub.
 */
function EnergyPage({ empty }: { empty: boolean }) {
  const { colors } = useTheme()
  const tiles = useTiles(empty)
  const { state } = useRenewvanBus()
  const battery = empty ? undefined : Object.values(state.batteries)[0]
  const togo = battery?.time_to_go_s
  if (empty || !tiles.battery.present) {
    return (
      <Explain
        icon={Zap}
        title="No energy devices yet."
        detail="Battery monitors, solar controllers and chargers show up here as soon as they are installed."
      />
    )
  }
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.summary, { backgroundColor: colors.surface, margin: layout.gutter, marginBottom: 0, gap: 4 }]}>
        <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: '700' }}>{tiles.battery.value}</Text>
        <Text style={{ color: colors.muted }}>
          {tiles.battery.sub}
          {togo ? ` · ${formatTimeToGo(togo)} left` : ''} · solar {tiles.solar.value}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Last 7 days: usage and yield (mock, history from the hub)</Text>
      </View>
      <PowerTab />
    </View>
  )
}

const LEVELS: EntityKey[] = ['tank', 'temperature', 'tilt']

/**
 * Levels: what the van measures about itself, as Venus' Levels page does (tanks and environment).
 * Tanks | Temperature | Tilt, one sub-tab each. A new measuring type adds a sub-tab here.
 */
function LevelsPage({ empty }: { empty: boolean }) {
  const { colors } = useTheme()
  const { state, entityIcons } = useRenewvanBus()
  const [part, setPart] = useState<'tanks' | 'temperature' | 'tilt'>('tanks')
  const sensors = sortedSensorIds(empty ? {} : state.temperatures)
  const tilt = empty ? undefined : Object.values(state.tilt)[0]
  if (empty || (Object.keys(state.tanks).length === 0 && sensors.length === 0 && !tilt)) {
    return (
      <Explain
        icon={Waves}
        title="No levels yet."
        detail="Tank levels, temperatures and tilt show up here when their sensors are installed."
      />
    )
  }
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.strip}>
        {(['tanks', 'temperature', 'tilt'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setPart(k)}
            style={[styles.pill, { backgroundColor: part === k ? alpha(colors.accent, 0.18) : colors.surface }]}
          >
            <Text style={{ color: colors.foreground }}>{k === 'tanks' ? 'Tanks' : k === 'temperature' ? 'Temperature' : 'Tilt'}</Text>
          </Pressable>
        ))}
      </View>
      {part === 'tanks' ? (
        <TanksTab />
      ) : part === 'temperature' ? (
        <Screen>
          {sensors.map((id) => (
            <TemperatureCard key={id} id={id} sensor={state.temperatures[id]} icon={entityIcons[iconKey('temperature', id)]} />
          ))}
          {sensors.length === 0 ? <Text style={{ color: colors.muted }}>No temperature sensors installed.</Text> : null}
        </Screen>
      ) : (
        <Screen>
          {tilt ? <TiltCard tilt={tilt} /> : <Text style={{ color: colors.muted }}>No tilt sensor installed.</Text>}
        </Screen>
      )}
    </View>
  )
}

/** MOCK: favourite scenes (one tap writes many entities; stored on the hub, not the phone). */
function Scenes() {
  const { colors } = useTheme()
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>Scenes (mock)</Text>
      <View style={styles.sectionTiles}>
        {['Good morning', 'Night', 'Leave van', 'Arrive'].map((name) => (
          <Pressable key={name} style={[styles.pill, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.foreground }}>{name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

/** Controls: everything writable. Heater commands, then relays by group. A new writable type lands here. */
function ControlsPage({ empty }: { empty: boolean }) {
  const { state, demoMode, relayGroups, relayGroupList, relayOrder, entityIcons } = useRenewvanBus()
  const commands = useCommands()
  const { colors } = useTheme()
  const heaterIds = Object.keys(state.heaters).sort()
  const hasRelays = Object.keys(state.relays).length > 0
  if (empty || (heaterIds.length === 0 && !hasRelays)) {
    return (
      <Explain
        icon={ToggleLeft}
        title="Nothing to control yet."
        detail="Relays, the heater and anything else you can switch appear here when their driver is installed."
      />
    )
  }
  return (
    <Screen>
      <Scenes />
      {heaterIds.map((id) => (
        <HeaterCard
          key={id}
          id={id}
          heater={state.heaters[id]}
          frozen={demoMode || !heaterDriversOnline(state)}
          commands={commands}
        />
      ))}
      {hasRelays ? (
        <RelayPanels
          relays={state.relays}
          driverOnline={relayDriversOnline(state)}
          demo={demoMode}
          onSetRelay={commands.setRelay}
          groups={relayGroups}
          groupList={relayGroupList ?? undefined}
          order={relayOrder}
          icons={entityIcons}
        />
      ) : (
        <Text style={{ color: colors.muted }}>No relays.</Text>
      )}
    </Screen>
  )
}

/** Map: the drill-down of the Position widget (find the van). Van GPS when there is one, else the phone's (see the GPS fallback ticket). */
function MapPage({ empty }: { empty: boolean }) {
  const { colors } = useTheme()
  const { state } = useRenewvanBus()
  const vanGps = !empty && Object.keys(state.gps).length > 0
  return (
    <View style={{ flex: 1 }}>
      {vanGps ? (
        <VanMap variant="page" />
      ) : (
        <Explain
          icon={MapPin}
          title="No GPS receiver in this van."
          detail="MOCK: this tab would show the phone's own position (ask for location permission here, not at launch)."
        />
      )}
      {!vanGps ? null : (
        <Text style={[styles.note, { color: colors.muted }]}>Van GPS</Text>
      )}
    </View>
  )
}

function AlertsPage() {
  const { entries, openCount } = useAlerts()
  const { colors } = useTheme()
  return (
    <Screen>
      <Text style={{ color: colors.muted }}>
        {openCount} open, {entries.length} in the log. (Today&apos;s Alerts screen, pushed from the header.)
      </Text>
      <Pressable onPress={() => router.push('/alerts')}>
        <Text style={{ color: colors.accent }}>Open the real Alerts screen</Text>
      </Pressable>
    </Screen>
  )
}

function SettingsPage() {
  const { colors } = useTheme()
  return (
    <Screen>
      <View style={[styles.row, { backgroundColor: colors.surface, gap: 12 }]}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>A</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontWeight: '600' }}>My account (mock)</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Vans: My van, Weekend van · Free plan</Text>
        </View>
        <ChevronRight size={16} color={colors.muted} />
      </View>
      {(['devices', 'general', 'connectivity', 'widgets'] as const).map((v) => (
        <Pressable key={v} onPress={() => openSettings(v)} style={[styles.row, { backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.foreground, flex: 1 }}>{v}</Text>
          <ChevronRight size={16} color={colors.muted} />
        </Pressable>
      ))}
      <View style={[styles.row, { backgroundColor: colors.surface, opacity: 0.7 }]}>
        <Text style={{ color: colors.foreground, flex: 1 }}>Automation (soon): rules and schedules, stored on the hub</Text>
        <ChevronRight size={16} color={colors.muted} />
      </View>
      <Pressable onPress={() => router.push('/settings')}>
        <Text style={{ color: colors.accent }}>Open the real Settings</Text>
      </Pressable>
    </Screen>
  )
}

// ---------------------------------------------------------------------------------------------
// Shell pieces
// ---------------------------------------------------------------------------------------------

interface TabDef {
  key: string
  label: string
  icon: LucideIcon
  badge?: boolean
  /** The tab's icon is drawn as a circle button inside its slot (an image icon in NativeTabs). */
  disc?: boolean
}

function TabBar({ tabs, current, onPick }: { tabs: TabDef[]; current: string; onPick: (key: string) => void }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surface, paddingBottom: insets.bottom }]}>
      {tabs.map(({ key, label, icon: Icon, badge, disc }) => {
        const on = key === current
        return (
          <Pressable key={key} onPress={() => onPick(key)} style={styles.tab}>
            <View style={[styles.indicator, on && !disc ? { backgroundColor: alpha(colors.accent, 0.18) } : null]}>
              {disc ? (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginVertical: -6,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? colors.accent : alpha(colors.accent, 0.18),
                  }}
                >
                  <Icon size={22} color={on ? '#fff' : colors.accent} />
                </View>
              ) : (
                <Icon size={20} color={on ? colors.accent : colors.muted} />
              )}
              {badge ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}
            </View>
            <Text style={{ color: on ? colors.accent : colors.muted, fontSize: 12 }}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function Header({
  title,
  onBack,
  right,
  logo,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
  /** Top-level screens: the renewvan lockup on the left instead of a title (variant E). */
  logo?: boolean
}) {
  const { colors } = useTheme()
  return (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      {logo && !onBack ? (
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <LogoLockup size={26} />
        </View>
      ) : onBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={styles.headerSide}>
          <ChevronLeft size={22} color={colors.foreground} />
        </Pressable>
      ) : (
        <View style={styles.headerSide} />
      )}
      {logo && !onBack ? null : (
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '600', flex: 1 }}>
          {title === 'renewvan' || title === 'Start' || title === 'Home' ? 'Home ▾' : title}
        </Text>
      )}
      <View style={styles.headerRight}>{right}</View>
    </View>
  )
}

const TITLES: Record<EntityKey, string> = {
  battery: 'Energy',
  solar: 'Energy',
  charger: 'Energy',
  tank: 'Water',
  relay: 'Controls',
  heater: 'Climate',
  temperature: 'Climate',
  tilt: 'Tilt',
  gps: 'Where is the van',
  router: 'Router',
}

// ---------------------------------------------------------------------------------------------
// Variant A: Venus. Five tabs, uniform tile grid, tiles never hide.
// ---------------------------------------------------------------------------------------------

function VariantA({ empty }: { empty: boolean }) {
  const tiles = useTiles(empty)
  const { openCount } = useAlerts()
  const [tab, setTab] = useState('start')
  const [drill, setDrill] = useState<EntityKey | null>(null)
  const tabs: TabDef[] = [
    { key: 'start', label: 'Start', icon: Gauge },
    { key: 'energy', label: 'Energy', icon: Zap },
    { key: 'controls', label: 'Controls', icon: ToggleLeft },
    { key: 'alerts', label: 'Alerts', icon: Bell, badge: openCount > 0 },
    { key: 'settings', label: 'Settings', icon: SettingsIcon },
  ]
  const order: EntityKey[] = ['battery', 'solar', 'tank', 'temperature', 'heater', 'relay', 'tilt', 'gps', 'charger', 'router']
  return (
    <>
      <Header
        title={drill ? TITLES[drill] : (tabs.find((t) => t.key === tab)?.label ?? '')}
        onBack={drill ? () => setDrill(null) : undefined}
      />
      <View style={{ flex: 1 }}>
        {drill ? (
          <DrillPage type={drill} empty={empty || !tiles[drill].present} />
        ) : tab === 'start' ? (
          <ScrollView contentContainerStyle={styles.grid}>
            {order.map((k) => (
              <TileView
                key={k}
                tile={tiles[k]}
                onPress={() => (k === 'relay' ? setTab('controls') : ENERGY.includes(k) ? setTab('energy') : setDrill(k))}
              />
            ))}
          </ScrollView>
        ) : tab === 'energy' ? (
          <EnergyPage empty={empty} />
        ) : tab === 'controls' ? (
          <ControlsPage empty={empty} />
        ) : tab === 'alerts' ? (
          <AlertsPage />
        ) : (
          <SettingsPage />
        )}
      </View>
      <TabBar tabs={tabs} current={tab} onPick={(k) => { setDrill(null); setTab(k) }} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// Variant B: Cards. Three tabs, Alerts + Settings in the header, today's full-width Start widgets
// made tappable (chevron), absent widgets simply not drawn.
// ---------------------------------------------------------------------------------------------

function VariantB({ empty }: { empty: boolean }) {
  const tiles = useTiles(empty)
  const { openCount } = useAlerts()
  const { colors } = useTheme()
  const [tab, setTab] = useState('start')
  const [drill, setDrill] = useState<EntityKey | null>(null)
  const tabs: TabDef[] = [
    { key: 'start', label: 'Start', icon: Gauge },
    { key: 'energy', label: 'Energy', icon: Zap },
    { key: 'controls', label: 'Controls', icon: ToggleLeft },
  ]
  const present = (Object.values(tiles) as Tile[]).filter((t) => t.present)
  return (
    <>
      <Header
        title={drill ? TITLES[drill] : 'renewvan'}
        onBack={drill ? () => setDrill(null) : undefined}
        right={
          <>
            <Pressable onPress={() => { setDrill(null); setTab('alerts') }} hitSlop={8}>
              <Bell size={20} color={colors.foreground} />
              {openCount > 0 ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}
            </Pressable>
            <Pressable onPress={() => { setDrill(null); setTab('settings') }} hitSlop={8}>
              <SettingsIcon size={20} color={colors.foreground} />
            </Pressable>
          </>
        }
      />
      <View style={{ flex: 1 }}>
        {drill ? (
          <DrillPage type={drill} empty={empty} />
        ) : tab === 'start' ? (
          <View style={{ flex: 1 }}>
            {present.length === 0 ? (
              <Explain icon={Gauge} title="No devices on this van yet." detail="Install a driver on the hub and its widget appears here. No app update." />
            ) : (
              // The real Start tab with every card; each card is also tappable via the strip above.
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.strip}>
                  {present.map((t) => (
                    <Pressable
                      key={t.key}
                      onPress={() => (t.key === 'relay' ? setTab('controls') : ENERGY.includes(t.key) ? setTab('energy') : setDrill(t.key))}
                      style={[styles.pill, { backgroundColor: colors.surface }]}
                    >
                      <t.icon size={14} color={colors.accent} />
                      <Text style={{ color: colors.foreground, fontSize: 13 }}>{t.title} {t.value}</Text>
                      <ChevronRight size={14} color={colors.muted} />
                    </Pressable>
                  ))}
                </ScrollView>
                <StartTab />
              </>
            )}
          </View>
        ) : tab === 'energy' ? (
          <EnergyPage empty={empty} />
        ) : tab === 'controls' ? (
          <ControlsPage empty={empty} />
        ) : tab === 'alerts' ? (
          <AlertsPage />
        ) : (
          <SettingsPage />
        )}
      </View>
      <TabBar tabs={tabs} current={tab} onPick={(k) => { setDrill(null); setTab(k) }} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// Variant C: Purpose. Home groups tiles under Power / Water / Climate / Locate; a section header
// drills into the section; More holds Alerts and Settings.
// ---------------------------------------------------------------------------------------------

/** One grouping for the circles (flat, in this order) and the cards (one per group). */
const GROUPS: { title: string; keys: EntityKey[] }[] = [
  { title: 'Energy', keys: ['battery', 'solar', 'charger'] },
  { title: 'Water', keys: ['tank'] },
  { title: 'Climate', keys: ['temperature', 'heater'] },
  { title: 'Van', keys: ['tilt', 'router'] },
  { title: 'Controls', keys: ['relay'] },
]

const SECTIONS: { title: string; keys: EntityKey[] }[] = [
  { title: 'Power', keys: ['battery', 'solar', 'charger'] },
  { title: 'Water', keys: ['tank'] },
  { title: 'Climate', keys: ['temperature', 'heater', 'tilt'] },
  { title: 'Locate & connect', keys: ['gps', 'router'] },
]

function VariantC({ empty }: { empty: boolean }) {
  const tiles = useTiles(empty)
  const { openCount } = useAlerts()
  const { colors } = useTheme()
  const [tab, setTab] = useState('home')
  const [drill, setDrill] = useState<EntityKey | null>(null)
  const tabs: TabDef[] = [
    { key: 'home', label: 'Home', icon: House },
    { key: 'energy', label: 'Energy', icon: Zap },
    { key: 'controls', label: 'Controls', icon: ToggleLeft },
    { key: 'more', label: 'More', icon: Ellipsis, badge: openCount > 0 },
  ]
  const [moreTab, setMoreTab] = useState<'alerts' | 'settings'>('alerts')
  return (
    <>
      <Header
        title={drill ? TITLES[drill] : (tabs.find((t) => t.key === tab)?.label ?? '')}
        onBack={drill ? () => setDrill(null) : undefined}
      />
      <View style={{ flex: 1 }}>
        {drill ? (
          <DrillPage type={drill} empty={empty || !tiles[drill].present} />
        ) : tab === 'home' ? (
          <ScrollView contentContainerStyle={styles.sections}>
            {/* Summary strip, like Homey's "Energy 893 W". */}
            <View style={[styles.summary, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.foreground, fontSize: 15 }}>
                {tiles.battery.present ? `Battery ${tiles.battery.value}` : 'No battery'} · {tiles.solar.present ? `Solar ${tiles.solar.value}` : 'No solar'} · {tiles.tank.present ? tiles.tank.value : 'No tanks'}
              </Text>
            </View>
            {SECTIONS.map((section) => {
              const here = section.keys.map((k) => tiles[k])
              // Sections with nothing installed collapse to one explanatory line, they do not vanish.
              const any = here.some((t) => t.present)
              return (
                <View key={section.title} style={{ gap: layout.gap }}>
                  <Pressable onPress={() => (section.title === 'Power' ? setTab('energy') : setDrill(section.keys[0]))} style={styles.sectionHead}>
                    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600', flex: 1 }}>{section.title}</Text>
                    <ChevronRight size={16} color={colors.muted} />
                  </Pressable>
                  {any ? (
                    <View style={styles.sectionTiles}>
                      {here.filter((t) => t.present).map((t) => (
                        <TileView
                          key={t.key}
                          tile={t}
                          onPress={() => (ENERGY.includes(t.key) ? setTab('energy') : setDrill(t.key))}
                        />
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                      Nothing installed for {section.title.toLowerCase()} yet.
                    </Text>
                  )}
                </View>
              )
            })}
          </ScrollView>
        ) : tab === 'energy' ? (
          <EnergyPage empty={empty} />
        ) : tab === 'controls' ? (
          <ControlsPage empty={empty} />
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.strip}>
              {(['alerts', 'settings'] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setMoreTab(k)}
                  style={[styles.pill, { backgroundColor: moreTab === k ? alpha(colors.accent, 0.18) : colors.surface }]}
                >
                  <Text style={{ color: colors.foreground }}>{k === 'alerts' ? `Alerts${openCount > 0 ? ` (${openCount})` : ''}` : 'Settings'}</Text>
                </Pressable>
              ))}
            </View>
            {moreTab === 'alerts' ? <AlertsPage /> : <SettingsPage />}
          </View>
        )}
      </View>
      <TabBar tabs={tabs} current={tab} onPick={(k) => { setDrill(null); setTab(k) }} />
    </>
  )
}

function VariantE({ empty }: { empty: boolean }) {
  const tiles = useTiles(empty)
  const { openCount } = useAlerts()
  const { colors } = useTheme()
  const [tab, setTab] = useState('home')
  const [drill, setDrill] = useState<EntityKey | null>(null)
  const tabs: TabDef[] = [
    { key: 'home', label: 'Home', icon: House },
    { key: 'energy', label: 'Energy', icon: Zap },
    { key: 'controls', label: 'Controls', icon: ToggleLeft },
    { key: 'settings', label: 'Settings', icon: SettingsIcon },
  ]
  return (
    <>
      <Header
        logo
        title={drill ? TITLES[drill] : tab === 'alerts' ? 'Alerts' : (tabs.find((t) => t.key === tab)?.label ?? '')}
        onBack={drill ? () => setDrill(null) : tab === 'alerts' ? () => setTab('home') : undefined}
        right={
          <Pressable onPress={() => { setDrill(null); setTab('alerts') }} hitSlop={8}>
            <Bell size={20} color={colors.foreground} />
            {openCount > 0 ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}
          </Pressable>
        }
      />
      <View style={{ flex: 1 }}>
        {drill ? (
          <DrillPage type={drill} empty={empty || !tiles[drill].present} />
        ) : tab === 'home' ? (
          <ScrollView contentContainerStyle={styles.sections}>
            {/* The map widget (Position): drills into the full map. Phone GPS when the van has none. */}
            {empty || !tiles.gps.present ? (
              <Pressable onPress={() => setDrill('gps')}>
                <Card>
                  <View style={{ padding: 16, gap: 4 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600' }}>Where is the van</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      No GPS in the van: shows this phone&apos;s position (mock).
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ) : (
              <Card>
                <VanMap variant="card" onExpand={() => setDrill('gps')} />
              </Card>
            )}
            {GROUPS.map((group) => {
              const here = group.keys.map((k) => tiles[k])
              const any = here.some((t) => t.present)
              const open = (k: EntityKey) =>
                ENERGY.includes(k) ? setTab('energy') : k === 'relay' ? setTab('controls') : setDrill(k)
              return (
                <View key={group.title} style={{ gap: 8 }}>
                  <Pressable onPress={() => open(group.keys[0])} style={styles.sectionHead}>
                    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600', flex: 1 }}>{group.title}</Text>
                    <ChevronRight size={16} color={colors.muted} />
                  </Pressable>
                  {any ? (
                    <View style={styles.sectionTiles}>
                      {here.filter((t) => t.present).map((t) => (
                        <TileView key={t.key} tile={t} onPress={() => open(t.key)} />
                      ))}
                    </View>
                  ) : (
                    <Text style={{ color: colors.muted, fontSize: 13 }}>Nothing installed for {group.title.toLowerCase()} yet.</Text>
                  )}
                </View>
              )
            })}
          </ScrollView>
        ) : tab === 'energy' ? (
          <EnergyPage empty={empty} />
        ) : tab === 'controls' ? (
          <ControlsPage empty={empty} />
        ) : tab === 'alerts' ? (
          <AlertsPage />
        ) : (
          <SettingsPage />
        )}
      </View>
      <TabBar tabs={tabs} current={tab} onPick={(k) => { setDrill(null); setTab(k) }} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// Variant D: Van hero. The van is the home button: a raised centre tab (the Start tab) with the van's
// icon and name, a hero header with the van drawn large, quick-status chips, favourite scenes and
// the tiles below. Two tabs either side. The free slot (Automate) is where automation would land.
// ---------------------------------------------------------------------------------------------

function VariantD({ empty }: { empty: boolean }) {
  const tiles = useTiles(empty)
  const { openCount } = useAlerts()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState('van')
  const [drill, setDrill] = useState<EntityKey | null>(null)
  const side: TabDef[] = [
    { key: 'energy', label: 'Energy', icon: Zap },
    { key: 'controls', label: 'Controls', icon: ToggleLeft },
    { key: 'levels', label: 'Levels', icon: Waves },
    { key: 'settings', label: 'Settings', icon: SettingsIcon },
  ]
  const pick = (k: string) => {
    setDrill(null)
    setTab(k)
  }
  // Every device type but position (the map widget covers it). A missing one stays, dimmed.
  const chips: EntityKey[] = GROUPS.flatMap((g) => g.keys)
  const sideTab = ({ key, label, icon: Icon, badge }: TabDef) => (
    <Pressable key={key} onPress={() => pick(key)} style={styles.tab}>
      <View>
        <Icon size={22} color={tab === key ? colors.accent : colors.muted} />
        {badge ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}
      </View>
      <Text style={{ color: tab === key ? colors.accent : colors.muted, fontSize: 11 }}>{label}</Text>
    </Pressable>
  )
  return (
    <>
      <Header
        logo
        title={drill ? TITLES[drill] : ''}
        onBack={drill ? () => setDrill(null) : undefined}
        right={
          <Pressable onPress={() => pick('alerts')} hitSlop={8}>
            <Bell size={20} color={colors.foreground} />
            {openCount > 0 ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}
          </Pressable>
        }
      />
      <View style={{ flex: 1 }}>
        {drill ? (
          <>
            <DrillPage type={drill} empty={empty || !tiles[drill].present} />
          </>
        ) : tab === 'van' ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ padding: layout.gutter, gap: 20 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {chips.map((k) => (
                  <Pressable key={k} onPress={() => (ENERGY.includes(k) ? pick('energy') : k === 'relay' ? pick('controls') : LEVELS.includes(k) ? pick('levels') : setDrill(k))} style={styles.chipCol}>
                    <View style={[styles.chipIcon, { backgroundColor: alpha(colors.accent, tiles[k].present ? 0.18 : 0.06) }]}>
                      {(() => {
                        const I = tiles[k].icon
                        return <I size={22} color={tiles[k].present ? colors.accent : colors.muted} />
                      })()}
                    </View>
                    <Text style={{ color: colors.foreground, fontSize: 12 }}>{tiles[k].present ? tiles[k].value : '–'}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{tiles[k].title}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {/* The map widget (Position): drills into the full map. Phone GPS when the van has none. */}
              {empty || !tiles.gps.present ? (
                <Pressable onPress={() => setDrill('gps')}>
                  <Card>
                    <View style={{ padding: 16, gap: 4 }}>
                      <Text style={{ color: colors.foreground, fontWeight: '600' }}>Where is the van</Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        No GPS in the van: shows this phone&apos;s position (mock).
                      </Text>
                    </View>
                  </Card>
                </Pressable>
              ) : (
                <Card>
                  <VanMap variant="card" onExpand={() => setDrill('gps')} />
                </Card>
              )}
              <Scenes />
            </View>
          </ScrollView>
        ) : tab === 'energy' ? (
          <>
            <EnergyPage empty={empty} />
          </>
        ) : tab === 'controls' ? (
          <>
            <ControlsPage empty={empty} />
          </>
        ) : tab === 'alerts' ? (
          <>
            <AlertsPage />
          </>
        ) : tab === 'levels' ? (
          <>
            <LevelsPage empty={empty} />
          </>
        ) : (
          <>
            <SettingsPage />
          </>
        )}
      </View>
      <View style={[styles.tabBar, { backgroundColor: colors.surface, paddingBottom: insets.bottom, alignItems: 'flex-end' }]}>
        {sideTab(side[0])}
        {sideTab(side[1])}
        <Pressable onPress={() => pick('van')} style={styles.centerWrap}>
          {/* Active: filled accent, white icon. Inactive: the bar's own surface, muted icon, same ring. */}
          <View
            style={[
              styles.centerBtn,
              tab === 'van'
                ? { backgroundColor: colors.accent, borderColor: colors.background }
                : { backgroundColor: colors.surface, borderColor: colors.background },
            ]}
          >
            <Van size={30} color={tab === 'van' ? '#fff' : colors.muted} />
          </View>
          <Text style={{ color: tab === 'van' ? colors.accent : colors.muted, fontSize: 11 }}>Home</Text>
        </Pressable>
        {sideTab(side[2])}
        {sideTab(side[3])}
      </View>
    </>
  )
}

// Variant F: D with a bar the native tab bar can draw: five equal tabs, the Van icon in the middle slot,
// no raised button. Same Home (circles, map, scenes), same Levels tab.
function VariantF({ empty }: { empty: boolean }) {
  const tiles = useTiles(empty)
  const { openCount } = useAlerts()
  const { colors } = useTheme()
  const [tab, setTab] = useState('van')
  const [drill, setDrill] = useState<EntityKey | null>(null)
  const side: TabDef[] = [
    { key: 'energy', label: 'Energy', icon: Zap },
    { key: 'controls', label: 'Controls', icon: ToggleLeft },
    { key: 'levels', label: 'Levels', icon: Waves },
    { key: 'settings', label: 'Settings', icon: SettingsIcon },
  ]
  const pick = (k: string) => {
    setDrill(null)
    setTab(k)
  }
  // Every device type but position (the map widget covers it). A missing one stays, dimmed.
  const chips: EntityKey[] = GROUPS.flatMap((g) => g.keys)
  return (
    <>
      <Header
        logo
        title={drill ? TITLES[drill] : ''}
        onBack={drill ? () => setDrill(null) : undefined}
        right={
          <Pressable onPress={() => pick('alerts')} hitSlop={8}>
            <Bell size={20} color={colors.foreground} />
            {openCount > 0 ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}
          </Pressable>
        }
      />
      <View style={{ flex: 1 }}>
        {drill ? (
          <>
            <DrillPage type={drill} empty={empty || !tiles[drill].present} />
          </>
        ) : tab === 'van' ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ padding: layout.gutter, gap: 20 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {chips.map((k) => (
                  <Pressable key={k} onPress={() => (ENERGY.includes(k) ? pick('energy') : k === 'relay' ? pick('controls') : LEVELS.includes(k) ? pick('levels') : setDrill(k))} style={styles.chipCol}>
                    <View style={[styles.chipIcon, { backgroundColor: alpha(colors.accent, tiles[k].present ? 0.18 : 0.06) }]}>
                      {(() => {
                        const I = tiles[k].icon
                        return <I size={22} color={tiles[k].present ? colors.accent : colors.muted} />
                      })()}
                    </View>
                    <Text style={{ color: colors.foreground, fontSize: 12 }}>{tiles[k].present ? tiles[k].value : '–'}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{tiles[k].title}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {/* The map widget (Position): drills into the full map. Phone GPS when the van has none. */}
              {empty || !tiles.gps.present ? (
                <Pressable onPress={() => setDrill('gps')}>
                  <Card>
                    <View style={{ padding: 16, gap: 4 }}>
                      <Text style={{ color: colors.foreground, fontWeight: '600' }}>Where is the van</Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        No GPS in the van: shows this phone&apos;s position (mock).
                      </Text>
                    </View>
                  </Card>
                </Pressable>
              ) : (
                <Card>
                  <VanMap variant="card" onExpand={() => setDrill('gps')} />
                </Card>
              )}
              <Scenes />
            </View>
          </ScrollView>
        ) : tab === 'energy' ? (
          <>
            <EnergyPage empty={empty} />
          </>
        ) : tab === 'controls' ? (
          <>
            <ControlsPage empty={empty} />
          </>
        ) : tab === 'alerts' ? (
          <>
            <AlertsPage />
          </>
        ) : tab === 'levels' ? (
          <>
            <LevelsPage empty={empty} />
          </>
        ) : (
          <>
            <SettingsPage />
          </>
        )}
      </View>
      {/* Equal tabs, Van in the middle slot: what NativeTabs can do. */}
      <TabBar
        tabs={[side[0], side[1], { key: 'van', label: 'Home', icon: Van, disc: true }, side[2], side[3]]}
        current={tab}
        onPick={pick}
      />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// Route + switcher
// ---------------------------------------------------------------------------------------------

const VARIANTS = [
  { key: 'A', name: 'Venus: 5 tabs, tiles' },
  { key: 'B', name: 'Cards: 3 tabs' },
  { key: 'C', name: 'Purpose: sections' },
  { key: 'D', name: 'Van centre tab + E' },
  { key: 'E', name: 'Purpose + bell in header' },
  { key: 'F', name: 'D with native-style bar' },
] as const

export default function PrototypeNav() {
  const params = useLocalSearchParams<{ variant?: string; empty?: string }>()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const variant = VARIANTS.find((v) => v.key === params.variant)?.key ?? 'A'
  const empty = params.empty === '1'
  const index = VARIANTS.findIndex((v) => v.key === variant)
  const go = (next: Partial<{ variant: string; empty: string }>) =>
    router.setParams({ variant, empty: empty ? '1' : '0', ...next })
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={[styles.switcher, { backgroundColor: colors.foreground }]}>
        <Pressable onPress={() => go({ variant: VARIANTS[(index + VARIANTS.length - 1) % VARIANTS.length].key })} hitSlop={8}>
          <ChevronLeft size={18} color={colors.background} />
        </Pressable>
        <Text style={{ color: colors.background, fontWeight: '600', flex: 1, textAlign: 'center' }}>
          {variant} ({VARIANTS[index].name})
        </Text>
        <Pressable onPress={() => go({ variant: VARIANTS[(index + 1) % VARIANTS.length].key })} hitSlop={8}>
          <ChevronRight size={18} color={colors.background} />
        </Pressable>
        <Pressable onPress={() => go({ empty: empty ? '0' : '1' })} hitSlop={8} style={styles.emptyBtn}>
          <Text style={{ color: colors.background, fontSize: 12 }}>{empty ? 'Empty van ✓' : 'Empty van'}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ color: colors.background, fontSize: 12 }}>Close</Text>
        </Pressable>
      </View>
      {variant === 'A' ? <VariantA empty={empty} /> : variant === 'B' ? <VariantB empty={empty} /> : variant === 'C' ? <VariantC empty={empty} /> : variant === 'D' ? <VariantD empty={empty} /> : variant === 'F' ? <VariantF empty={empty} /> : <VariantE empty={empty} />}
    </View>
  )
}

const styles = StyleSheet.create({
  switcher: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8 },
  emptyBtn: { paddingHorizontal: 6 },
  header: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 8 },
  headerSide: { width: 32 },
  headerRight: { flexDirection: 'row', gap: 16, paddingRight: 8 },
  tabBar: { flexDirection: 'row', paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingBottom: 6 },
  indicator: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: radius['3xl'] },
  dot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.gap, padding: layout.gutter },
  tile: { width: '47.5%', gap: 4, padding: 14, borderRadius: radius['3xl'] },
  tileWide: { width: '100%' },
  strip: { flexDirection: 'row', gap: 8, padding: layout.gutter },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius['2xl'] },
  sections: { gap: 20, padding: layout.gutter },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
  sectionTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.gap },
  summary: { padding: 14, borderRadius: radius['3xl'] },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius['2xl'] },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 6, paddingBottom: 24, paddingHorizontal: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 12 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  chipCol: { alignItems: 'center', gap: 4, width: 64 },
  chipIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  centerWrap: { flex: 1, alignItems: 'center', gap: 2, marginTop: -28, paddingBottom: 6 },
  centerBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 4 },
  note: { position: 'absolute', bottom: 8, left: 12, fontSize: 11 },
})
