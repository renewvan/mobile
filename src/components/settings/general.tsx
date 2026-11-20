import Constants from 'expo-constants'
import * as Updates from 'expo-updates'
import { router } from 'expo-router'
import { Check } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAlerts } from '@/alerts/AlertsProvider'
import { ensureNotificationPermission } from '@/alerts/notifications'
import { AUTO_SLEEP_TIMEOUT_CHOICES, type AutoSleepTimeoutMinutes } from '@/bus/reducer'
import { confirm, NativeButton, NativeSlider, NativeTextField } from '@/components/native'
import { tabular } from '@/components/ui'
import { panelsFor } from '@/config/relayPanels'
import { ENTITY_TYPES } from '@/lib/drivers'
import { classifyHost, hubRouteText } from '@/lib/hubAddress'
import {
  addedRelayGroup,
  canAddRelayGroup,
  relayGroupNameProblem,
  renamedRelayGroups,
  reorderedRelayGroups,
  withoutRelayGroup,
  RELAY_GROUP_MAX,
  RELAY_GROUP_NAME_MAX,
  UNASSIGNED_GROUP,
} from '@/lib/relayGroups'
import { reorderedRelayOrder } from '@/lib/relayOrder'
import { sensorLabel, sortedSensorIds } from '@/lib/temperature'
import { usePreferences } from '@/preferences/PreferencesProvider'
import { useCapabilities } from '@/hooks/useCapabilities'
import { widgetAvailability } from '@/lib/widgets'
import {
  DEFAULT_HOME_LAYOUT,
  POWER_LAYOUTS,
  POWER_LAYOUT_HINTS,
  POWER_LAYOUT_LABELS,
  WIDGET_IDS,
  HEX_COLOR,
  VAN_COLOR_PRESETS,
  VAN_FIELDS,
  VAN_LABELS,
  homeLayoutWithAvailable,
  isDefaultLayout,
  shownWidgets,
  type ThemeChoice,
} from '@/preferences/preferences'
import { useSession } from '@/session/SessionProvider'
import { useTheme } from '@/theme'
import { leaveScreen } from './devices'
import { WidgetList } from './WidgetList'
import {
  Box,
  ChoiceRow,
  DetailList,
  DetailRow,
  Empty,
  Group,
  MoveRow,
  NameField,
  NavRow,
  Note,
  SwitchRow,
} from './kit'
import { openSettings } from './routes'
import { useSettingsData } from './useSettingsData'

// Settings › General and the section, kiosk, van and phone screens that share these building blocks.

export function GeneralView() {
  const { demoMode, commands } = useSettingsData()
  return (
    <>
      <Group title="Preferences">
        <NavRow
          label="Display & Appearance"
          description="Theme"
          onPress={() => openSettings('display')}
        />
      </Group>
      <Group title="System">
        <NavRow
          label="Firmware"
          description="Hub, app and driver versions"
          onPress={() => openSettings('firmware')}
        />
        <NavRow label="About" description="This app" onPress={() => openSettings('about')} />
        <Box>
          <SwitchRow
            label="Demo mode"
            description={demoMode ? 'Simulated van data' : 'Live van data'}
            value={demoMode}
            onChange={commands.setDemoMode}
          />
        </Box>
        <Note>
          Demo mode is one switch for the whole van: the kiosk and every phone show the simulated
          van while it is on, and no command reaches the real one.
        </Note>
      </Group>
    </>
  )
}

/** Whether a new alert is posted as a notification on this phone. The Alerts screen keeps the log either way. */
export function AlertsView() {
  const { alertsEnabled, update } = usePreferences()
  const { openCount } = useAlerts()
  const [blocked, setBlocked] = useState(false)
  const set = async (on: boolean) => {
    // Switching on asks the phone for permission; refused, it stays off rather than claim to notify.
    const granted = !on || (await ensureNotificationPermission().catch(() => false))
    setBlocked(!granted)
    update({ alertsEnabled: granted ? on : false })
  }
  return (
    <>
      <Group
        title="Notifications"
        note="This phone's own choice. Alerts are still recorded on the Alerts screen while this is off."
      >
        <Box>
          <SwitchRow
            label="Show alert notifications"
            description={openCount === 1 ? '1 alert open now' : `${openCount} alerts open now`}
            value={alertsEnabled}
            onChange={(on) => void set(on)}
          />
        </Box>
        {blocked && (
          <Note tone="danger">
            Notifications are blocked for Renewvan. Allow them in the phone&apos;s app settings,
            then switch this on again.
          </Note>
        )}
      </Group>
      <Group title="Log">
        <NavRow
          label="Alert log"
          description="Open and resolved alerts"
          attention={openCount > 0}
          onPress={() => router.push('/alerts')}
        />
      </Group>
    </>
  )
}

const THEME_OPTIONS: readonly { key: ThemeChoice; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
]

export function DisplayView() {
  const { theme, update } = usePreferences()
  return (
    <Group title="Appearance" note="The theme is this phone's own.">
      <Box padded>
        <ChoiceRow
          label="Theme"
          options={THEME_OPTIONS}
          value={theme}
          onChange={(next) => update({ theme: next })}
        />
      </Box>
    </Group>
  )
}

const POWER_LAYOUT_OPTIONS = POWER_LAYOUTS.map((key) => ({ key, label: POWER_LAYOUT_LABELS[key] }))

/** How the power-flow diagram is drawn on the Energy tab and in Home's Power flow widget. */
export function PowerPageView() {
  const { powerLayout, update } = usePreferences()
  return (
    <Group
      title="Layout"
      note="This phone's own choice. Home's Power flow widget draws the same layout."
    >
      <Box padded>
        <ChoiceRow
          label="Power layout"
          options={POWER_LAYOUT_OPTIONS}
          value={powerLayout}
          onChange={(next) => update({ powerLayout: next })}
        />
      </Box>
      <Note>{POWER_LAYOUT_HINTS[powerLayout]}</Note>
    </Group>
  )
}

/** Home's widgets: shown or hidden, and in what order, by dragging or by the switch; then its status circles. */
export function WidgetsView() {
  const { homeLayout, hiddenStatusTypes, update } = usePreferences()
  const capabilities = useCapabilities()
  // Loading widgets stay listed; only those the van has no device for are left out.
  const listed = WIDGET_IDS.filter((id) => widgetAvailability(id, capabilities) !== 'unavailable')
  const shown = shownWidgets(homeLayout).filter((id) => listed.includes(id))
  const unavailable = WIDGET_IDS.length - listed.length
  const set = (next: readonly (typeof shown)[number][]) =>
    update({ homeLayout: homeLayoutWithAvailable(homeLayout, listed, next) })
  return (
    <>
      <Note>
        Choose what Home shows. Hold a grip and drag to reorder; drop a widget above the line to
        show it, below to hide it. A widget the van has no device for stays out of sight.
      </Note>
      <WidgetList layout={shown} widgets={listed} onChange={set} />
      {unavailable > 0 && (
        <Note>
          {unavailable === 1 ? '1 more widget appears' : `${unavailable} more widgets appear`} when
          their devices are installed
        </Note>
      )}
      <Group
        title="Status circles"
        note="The row at the top of Home, one circle per kind of device."
      >
        {ENTITY_TYPES.map(({ type, label }) => (
          <SwitchRow
            key={type}
            label={label}
            value={!hiddenStatusTypes.includes(type)}
            onChange={(on) =>
              update({
                hiddenStatusTypes: on
                  ? hiddenStatusTypes.filter((t) => t !== type)
                  : [...hiddenStatusTypes, type],
              })
            }
          />
        ))}
      </Group>
      <NativeButton
        label="Reset to default"
        variant="outlined"
        disabled={isDefaultLayout(homeLayout) && hiddenStatusTypes.length === 0}
        onPress={() => update({ homeLayout: DEFAULT_HOME_LAYOUT, hiddenStatusTypes: [] })}
      />
    </>
  )
}

/** Which temperature sensors get a card on Levels › Temperature. */
export function TemperaturePageView() {
  const { state } = useSettingsData()
  const { hiddenTemperatures: hidden, update } = usePreferences()
  const reported = sortedSensorIds(state.temperatures)
  // A hidden sensor that is not reporting right now stays listed, so it can be shown again.
  const ids = [...reported, ...hidden.filter((id) => !reported.includes(id))]
  const setShown = (id: string, shown: boolean) =>
    update({ hiddenTemperatures: shown ? hidden.filter((h) => h !== id) : [...hidden, id] })
  return (
    <Group
      title="Sensors"
      note="A sensor you hide is still read and logged; it just does not get a card on Levels › Temperature on this phone."
    >
      {ids.length === 0 ? (
        <Empty>No temperature sensors found.</Empty>
      ) : (
        <Box>
          {ids.map((id) => {
            const shown = !hidden.includes(id)
            const sensor = state.temperatures[id]
            return (
              <SwitchRow
                key={id}
                label={sensor ? sensorLabel(id, sensor) : id}
                description={shown ? 'Shown on Levels › Temperature' : 'Hidden'}
                value={shown}
                onChange={(next) => setShown(id, next)}
              />
            )
          })}
        </Box>
      )}
    </Group>
  )
}

const relayCount = (n: number) => (n === 1 ? '1 relay' : `${n} relays`)

/** The groups of the Controls tab: their order, and adding one. Shared with the dashboard. */
export function RelaysPageView() {
  const { state, relayGroups, groupList: list, relayOrder, commands, demoMode } = useSettingsData()
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<string>()
  // The text field owns its text; a new key empties it after a group is added.
  const [fieldKey, setFieldKey] = useState(0)
  const panels = panelsFor(Object.keys(state.relays), relayGroups, list, relayOrder)
  const countOf = (title: string) => panels.find((panel) => panel.title === title)?.ids.length ?? 0
  const move = (from: number, to: number) =>
    commands.setRelayGroupList(reorderedRelayGroups(list, from, to))
  const full = !canAddRelayGroup(list)

  const add = () => {
    const name = draft.trim()
    const why = relayGroupNameProblem(name, list)
    setProblem(why)
    if (why !== undefined) return
    commands.setRelayGroupList(addedRelayGroup(list, name))
    setDraft('')
    setFieldKey((key) => key + 1)
  }

  return (
    <>
      <Note>
        The groups of the Controls page, in the order it shows them, Unassigned included. They are
        shared: the dashboard and every phone show the same groups.
      </Note>
      <Group
        title="Groups"
        note="A relay with no group, or whose group you remove, shows under Unassigned."
      >
        {list.map((name, i) => (
          <MoveRow
            key={name}
            label={name}
            description={`Position ${i + 1} of ${list.length} · ${relayCount(countOf(name))}`}
            onOpen={() => openSettings('relay-group', name)}
            onUp={demoMode || i === 0 ? undefined : () => move(i, i - 1)}
            onDown={demoMode || i === list.length - 1 ? undefined : () => move(i, i + 1)}
          />
        ))}
      </Group>
      <Group title="Add a group">
        <Box padded>
          <NativeTextField
            key={fieldKey}
            label="New group"
            error={problem ?? null}
            onChangeText={(text) => {
              setDraft(text)
              setProblem(undefined)
            }}
            onSubmit={add}
          />
          <NativeButton
            label="Add"
            disabled={demoMode || full || draft.trim() === ''}
            onPress={add}
          />
        </Box>
        {full && <Note>At most {RELAY_GROUP_MAX} groups, besides Unassigned.</Note>}
        {demoMode && <Note>Demo mode is read-only.</Note>}
      </Group>
    </>
  )
}

/** One relay group: its name, the order of its relays, and removing it. */
export function RelayGroupView({ id: name }: { id: string }) {
  const { state, relayGroups, groupList: list, relayOrder, commands, demoMode } = useSettingsData()
  const [problem, setProblem] = useState<string>()
  if (!list.includes(name)) return <Empty>This group no longer exists.</Empty>
  const relayIds = Object.keys(state.relays)
  const panel = panelsFor(relayIds, relayGroups, list, relayOrder).find((p) => p.title === name)
  const isUnassigned = name === UNASSIGNED_GROUP
  const membersOf = (group: string) =>
    Object.keys(relayGroups).filter((relayId) => relayGroups[relayId] === group)

  const rename = (to: string) => {
    const why = relayGroupNameProblem(to, list, name)
    setProblem(why)
    if (why !== undefined) return
    // The hub leaves the assignments alone when the list changes, so the relays move first.
    for (const relayId of membersOf(name)) commands.setRelayGroup(relayId, to)
    commands.setRelayGroupList(renamedRelayGroups(list, name, to))
    router.setParams({ id: to })
  }

  const remove = () =>
    confirm({
      title: `Remove ${name}?`,
      message: 'Its relays are not deleted: they show under Unassigned.',
      action: 'Remove group',
      destructive: true,
      onConfirm: () => {
        for (const relayId of membersOf(name)) commands.setRelayGroup(relayId, null)
        commands.setRelayGroupList(withoutRelayGroup(list, name))
        leaveScreen()
      },
    })

  const moveRelay = (from: number, to: number) => {
    if (panel === undefined) return
    commands.setRelayOrder(reorderedRelayOrder(relayIds, relayOrder, panel.ids, from, to))
  }

  return (
    <>
      {!isUnassigned && (
        <Group title="Name">
          <Box padded>
            <NameField
              name={name}
              maxBytes={RELAY_GROUP_NAME_MAX}
              disabled={demoMode}
              problem={problem}
              onCommit={rename}
            />
          </Box>
        </Group>
      )}
      <Group title="Relays">
        {panel === undefined ? (
          <Empty>
            {isUnassigned
              ? 'Every relay is in a group.'
              : 'No relays in this group. Pick it on a relay under Settings › Devices › Relays.'}
          </Empty>
        ) : (
          panel.ids.map((relayId, i) => {
            const relay = state.relays[relayId]
            const named = relay?.name !== undefined
            const single = panel.ids.length < 2
            return (
              <MoveRow
                key={relayId}
                label={relay?.name ?? relayId}
                description={`${named ? `${relayId} · ` : ''}Position ${i + 1} of ${panel.ids.length}`}
                onUp={demoMode || single || i === 0 ? undefined : () => moveRelay(i, i - 1)}
                onDown={
                  demoMode || single || i === panel.ids.length - 1
                    ? undefined
                    : () => moveRelay(i, i + 1)
                }
              />
            )
          })
        )}
      </Group>
      {!isUnassigned && (
        <NativeButton label="Remove group" variant="danger" disabled={demoMode} onPress={remove} />
      )}
    </>
  )
}

const TIMEOUT_OPTIONS = AUTO_SLEEP_TIMEOUT_CHOICES.map((minutes) => ({
  key: String(minutes),
  label: `${minutes}m`,
}))

/**
 * The kiosk's screen, from wherever the phone is: sleep or wake it, its brightness, and its
 * auto-sleep. These are the kiosk host plugin's own topics, so the dashboard's Settings shows the
 * same values; a value the kiosk has not reported stays disabled.
 */
export function KioskView() {
  const { kiosk, commands } = useSettingsData()
  const { colors } = useTheme()
  const [dragging, setDragging] = useState<number | null>(null)
  const silent =
    kiosk.power === null &&
    kiosk.brightness === null &&
    kiosk.autoSleepEnabled === null &&
    kiosk.autoSleepTimeoutMinutes === null
  const brightness = dragging ?? kiosk.brightness
  return (
    <>
      {silent && (
        <Note>
          The kiosk has not reported its display. These controls work once the hub&apos;s kiosk
          plugin is running.
        </Note>
      )}
      <Group title="Screen">
        <Box>
          <SwitchRow
            label="Screen on"
            description={
              kiosk.power === null ? 'Not reported' : kiosk.power === 'on' ? 'Awake' : 'Asleep'
            }
            value={kiosk.power === 'on'}
            disabled={kiosk.power === null}
            onChange={commands.setKioskDisplayPower}
          />
        </Box>
        <Box padded>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '500' }}>
              Brightness
            </Text>
            <Text style={[{ color: colors.muted, fontSize: 13 }, tabular]}>
              {brightness === null ? '—' : `${brightness}%`}
            </Text>
          </View>
          <NativeSlider
            label="Brightness"
            value={kiosk.brightness ?? 0}
            min={0}
            max={100}
            disabled={kiosk.brightness === null}
            onChange={setDragging}
            onCommit={(value) => {
              setDragging(null)
              commands.setKioskBrightness(value)
            }}
          />
        </Box>
      </Group>
      <Group title="Auto-sleep">
        <Box>
          <SwitchRow
            label="Auto-sleep"
            description="Turn the screen off after a while without a touch"
            value={kiosk.autoSleepEnabled ?? false}
            disabled={kiosk.autoSleepEnabled === null}
            onChange={commands.setKioskAutoSleepEnabled}
          />
        </Box>
        {kiosk.autoSleepEnabled === true && (
          <Box padded>
            <ChoiceRow
              label="Sleep after"
              options={TIMEOUT_OPTIONS}
              value={
                kiosk.autoSleepTimeoutMinutes === null
                  ? undefined
                  : String(kiosk.autoSleepTimeoutMinutes)
              }
              disabled={kiosk.autoSleepTimeoutMinutes === null}
              onChange={(key) =>
                commands.setKioskAutoSleepTimeoutMinutes(Number(key) as AutoSleepTimeoutMinutes)
              }
            />
          </Box>
        )}
      </Group>
    </>
  )
}

export function FirmwareView() {
  const { drivers, hubStatus } = useSettingsData()
  return (
    <DetailList>
      <DetailRow label="Hub" value={hubStatus?.version ?? 'Unknown'} />
      <DetailRow label="App" value={Constants.expoConfig?.version ?? null} />
      {drivers.map((row) => (
        <DetailRow key={row.key} label={row.name} value={row.version} />
      ))}
    </DetailList>
  )
}

export function AboutView() {
  const { currentlyRunning, isUpdateAvailable, isUpdatePending, isChecking, isDownloading } =
    Updates.useUpdates()
  const [message, setMessage] = useState<string | null>(null)
  const busy = isChecking || isDownloading
  const check = async () => {
    setMessage(null)
    try {
      const result = await Updates.checkForUpdateAsync()
      if (result.isAvailable) await Updates.fetchUpdateAsync()
      else setMessage('You are on the latest update.')
    } catch {
      setMessage('Could not check for updates.')
    }
  }
  const updateId = currentlyRunning.updateId
  return (
    <>
      <DetailList>
        <DetailRow label="App" value="Renewvan" />
        <DetailRow label="Version" value={Constants.expoConfig?.version ?? null} />
        <DetailRow
          label="Update"
          value={
            updateId ? updateId.slice(0, 8) : currentlyRunning.isEmbeddedLaunch ? 'Built in' : null
          }
        />
        <DetailRow label="Licence" value="MIT" />
        <DetailRow label="Source" value="github.com/renewvan/mobile" />
      </DetailList>
      {Updates.isEnabled ? (
        <Box padded>
          {isUpdatePending ? (
            <NativeButton label="Restart to apply" onPress={() => void Updates.reloadAsync()} />
          ) : (
            <NativeButton
              label={busy ? 'Checking…' : 'Check for updates'}
              disabled={busy}
              variant="outlined"
              onPress={() => void check()}
            />
          )}
        </Box>
      ) : null}
      {isUpdatePending ? (
        <Note>An update is ready. Restart the app to apply it.</Note>
      ) : message || isUpdateAvailable ? (
        <Note>{message ?? 'An update is available.'}</Note>
      ) : null}
      <Note>
        The phone companion to the Renewvan dashboard. It reads the same bus, shows the same van and
        sends the same commands; what a reading means is decided by the dashboard&apos;s own logic.
      </Note>
    </>
  )
}

/** Black or white, whichever reads on the swatch's fill. */
function checkColor(fill: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(fill.slice(i, i + 2), 16))
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#0f172a' : '#ffffff'
}

/**
 * The van's colour on the map: swatches (the first is the default accent) and a typed `#rrggbb`
 * for any other. An empty value is the default. shortcut: no colour wheel (needs a native
 * module), upgrade if typing a hex proves a chore.
 */
function VanColor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { colors } = useTheme()
  const [hex, setHex] = useState(value && !VAN_COLOR_PRESETS.includes(value) ? value : '')
  const swatch = (fill: string, selected: boolean, label: string, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        vanColorStyles.swatch,
        { backgroundColor: fill, borderColor: selected ? colors.foreground : colors.border },
      ]}
    >
      {selected && <Check size={22} color={checkColor(fill)} strokeWidth={3} />}
    </Pressable>
  )
  return (
    <View style={vanColorStyles.root}>
      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '500' }}>
        Colour{' '}
        <Text style={{ color: colors.muted, fontWeight: '400' }}>· {value || 'Default blue'}</Text>
      </Text>
      <View accessibilityRole="radiogroup" style={vanColorStyles.swatches}>
        {swatch(colors.accent, value === '', 'Default blue', () => onChange(''))}
        {VAN_COLOR_PRESETS.map((color) =>
          swatch(color, value === color, color, () => onChange(color)),
        )}
      </View>
      <NativeTextField
        label="Custom colour (#rrggbb)"
        defaultValue={hex}
        error={hex !== '' && !HEX_COLOR.test(hex) ? 'Use the form #rrggbb.' : undefined}
        onChangeText={(text) => {
          const next = text.trim()
          setHex(next)
          if (HEX_COLOR.test(next)) onChange(next)
        }}
      />
    </View>
  )
}

const vanColorStyles = StyleSheet.create({
  root: { gap: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderRadius: 22, // a circle: half the size
    alignItems: 'center',
    justifyContent: 'center',
  },
})

/** The van's details. Kept on this phone, as the dashboard keeps its own on the kiosk. */
export function VanView() {
  const { van, update } = usePreferences()
  return (
    <>
      <Box padded>
        {VAN_FIELDS.map((field) => (
          <NativeTextField
            key={field}
            label={VAN_LABELS[field]}
            defaultValue={van[field]}
            onChangeText={(text) => update({ van: { ...van, [field]: text.trim() } })}
          />
        ))}
        <VanColor value={van.color} onChange={(color) => update({ van: { ...van, color } })} />
      </Box>
      <Note>
        Kept on this phone. The kiosk keeps its own copy in Settings › Van; the two are not shared
        yet, because the bus has no topic for them.
      </Note>
    </>
  )
}

/** Which van this phone is connected to, and signing out of it. */
export function ConnectionView() {
  const { connection, signOut } = useSession()
  const { status, hubStatus } = useSettingsData()
  if (connection === null) return <Empty>Not connected to a van.</Empty>
  const { target, config } = connection
  let brokerHost: string | null = null
  try {
    brokerHost = new URL(config.url).hostname
  } catch {
    // an address that does not parse shows as unknown
  }
  const askSignOut = () =>
    confirm({
      title: 'Sign out?',
      message: 'This phone forgets the van. You will need its address again.',
      action: 'Sign out',
      destructive: true,
      onConfirm: () => void signOut(),
    })
  return (
    <>
      <DetailList heading="This phone">
        <DetailRow label="Van address" value={target.display} />
        <DetailRow
          label="Connection"
          value={target.kind === 'hub' ? 'Signed in to the hub' : 'Direct to the broker'}
        />
        <DetailRow
          label="Status"
          value={
            status === 'connected'
              ? 'Connected'
              : status === 'connecting'
                ? 'Connecting…'
                : 'Not connected'
          }
          tone={status === 'connected' ? 'ok' : status === 'connecting' ? 'unknown' : 'offline'}
        />
        <DetailRow
          label="Reached over"
          value={brokerHost === null ? null : hubRouteText(classifyHost(brokerHost))}
        />
        <DetailRow label="Broker login" value={config.username ? 'Required' : 'None'} />
      </DetailList>
      <DetailList heading="Hub">
        <DetailRow label="Address" value={hubStatus?.ip ?? null} />
        <DetailRow label="Hostname" value={hubStatus?.hostname ?? null} />
        <DetailRow label="Version" value={hubStatus?.version ?? null} />
      </DetailList>
      <NativeButton label="Sign out" variant="danger" onPress={askSignOut} />
    </>
  )
}
