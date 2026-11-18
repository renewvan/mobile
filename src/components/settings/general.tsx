import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { useAlerts } from '@/alerts/AlertsProvider'
import { ensureNotificationPermission } from '@/alerts/notifications'
import { AUTO_SLEEP_TIMEOUT_CHOICES, type AutoSleepTimeoutMinutes } from '@/bus/reducer'
import { confirm, NativeButton, NativeSlider, NativeTextField } from '@/components/native'
import { tabular } from '@/components/ui'
import { panelsFor } from '@/config/relayPanels'
import { classifyHost, hubRouteText } from '@/lib/hubAddress'
import {
  addedRelayGroup,
  canAddRelayGroup,
  ownGroups,
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
import {
  DEFAULT_START_LAYOUT,
  POWER_LAYOUTS,
  POWER_LAYOUT_HINTS,
  POWER_LAYOUT_LABELS,
  START_WIDGET_IDS,
  VAN_FIELDS,
  VAN_LABELS,
  isDefaultLayout,
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

// Settings › General and what hangs off it: the app's own appearance and widgets, the pages'
// options, the kiosk's screen, the van's details, and this phone's connection.

export function GeneralView() {
  const { demoMode, commands } = useSettingsData()
  const { alertsEnabled } = usePreferences()
  return (
    <>
      <Group title="Preferences">
        <NavRow
          label="Display & Appearance"
          description="Theme, widgets, pages"
          onPress={() => openSettings('display')}
        />
        <NavRow
          label="Dashboard"
          description="Screen power, brightness, auto-sleep"
          onPress={() => openSettings('kiosk')}
        />
        <NavRow
          label="Alerts"
          description={alertsEnabled ? 'Notifications on' : 'Notifications off'}
          onPress={() => openSettings('alerts')}
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
            Notifications are blocked for renewvan. Allow them in the phone&apos;s app settings,
            then switch this on again.
          </Note>
        )}
      </Group>
      <NavRow label="Alert history" onPress={() => router.push('/alerts')} />
    </>
  )
}

const THEME_OPTIONS: readonly { key: ThemeChoice; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
]

export function DisplayView() {
  const { state, groupList } = useSettingsData()
  const { theme, startLayout, hiddenTemperatures, powerLayout, update } = usePreferences()
  const sensorCount = Object.keys(state.temperatures).length
  const shown = Object.keys(state.temperatures).filter(
    (id) => !hiddenTemperatures.includes(id),
  ).length
  const groupCount = ownGroups(groupList).length
  return (
    <>
      <Group title="Appearance" note="The theme and the widgets are this phone's own.">
        <Box padded>
          <ChoiceRow
            label="Theme"
            options={THEME_OPTIONS}
            value={theme}
            onChange={(next) => update({ theme: next })}
          />
        </Box>
        <NavRow
          label="Widgets"
          description={`${startLayout.length} of ${START_WIDGET_IDS.length} on the Start tab`}
          onPress={() => openSettings('widgets')}
        />
      </Group>
      <Group title="Pages">
        <NavRow
          label="Power"
          description={POWER_LAYOUT_LABELS[powerLayout]}
          onPress={() => openSettings('power-page')}
        />
        <NavRow
          label="Temperature"
          description={`${shown} of ${sensorCount} sensors shown`}
          onPress={() => openSettings('temperature-page')}
        />
        <NavRow
          label="Relays"
          description={`${groupCount} ${groupCount === 1 ? 'group' : 'groups'}`}
          onPress={() => openSettings('relays-page')}
        />
      </Group>
    </>
  )
}

const POWER_LAYOUT_OPTIONS = POWER_LAYOUTS.map((key) => ({ key, label: POWER_LAYOUT_LABELS[key] }))

/** How the power-flow diagram is drawn on the Power tab and in the Start tab's Energy widget. */
export function PowerPageView() {
  const { powerLayout, update } = usePreferences()
  return (
    <Group
      title="Layout"
      note="This phone's own choice. The Start tab's Energy widget draws the same layout."
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

/** The Start tab's widgets: shown or hidden, and in what order, by dragging or by the switch. */
export function WidgetsView() {
  const { startLayout: layout, update } = usePreferences()
  const set = (next: typeof layout) => update({ startLayout: next })
  return (
    <>
      <Note>
        Choose what the Start tab shows. Hold a grip and drag to reorder; drop a widget above the
        line to show it, below to hide it.
      </Note>
      <WidgetList layout={layout} onChange={set} />
      <NativeButton
        label="Reset to default"
        variant="outlined"
        disabled={isDefaultLayout(layout)}
        onPress={() => set(DEFAULT_START_LAYOUT)}
      />
    </>
  )
}

/** Which temperature sensors get a card on the Climate tab. */
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
      note="A sensor you hide is still read and logged; it just does not get a card on the Climate tab of this phone."
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
                description={shown ? 'Shown on the Climate tab' : 'Hidden'}
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

/** The groups of the Relays tab: their order, and adding one. Shared with the dashboard. */
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
        The groups of the Relays page, in the order it shows them, Unassigned included. They are
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
  return (
    <>
      <DetailList>
        <DetailRow label="App" value="renewvan" />
        <DetailRow label="Version" value={Constants.expoConfig?.version ?? null} />
        <DetailRow label="Licence" value="MIT" />
        <DetailRow label="Source" value="github.com/renewvan/mobile" />
      </DetailList>
      <Note>
        The phone companion to the renewvan dashboard. It reads the same bus, shows the same van and
        sends the same commands; what a reading means is decided by the dashboard&apos;s own logic.
      </Note>
    </>
  )
}

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
