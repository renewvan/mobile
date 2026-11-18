import { Power } from 'lucide-react-native'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Segmented } from '@/components/native'
import { Banner, Card } from '@/components/ui'
import { criticalRelayIds, panelsFor } from '@/config/relayPanels'
import { EntityIcon } from '@/components/EntityIcon'
import { iconKey } from '@/lib/entityIcons'
import { DEFAULT_RELAY_GROUP_LIST } from '@/lib/relayGroups'
import { radius, useTheme } from '@/theme'
import type { Relay } from '@/types'
import { useCommandPhases, type Phase } from './useCommandPhases'

const SEGMENTS = [
  { key: 'off', label: 'Off' },
  { key: 'on', label: 'On' },
] as const

export interface RelayPanelsProps {
  relays: Record<string, Relay>
  /** Every Driver that publishes `relay` is online. False reads as Unknown. */
  driverOnline: boolean
  /** Demo mode: show the relays, but every control is disabled and nothing is ever sent. */
  demo: boolean
  /** Sends the TARGET state to the relay's `set` topic. */
  onSetRelay: (id: string, on: boolean) => void
  /** Loads that ask before switching. */
  criticalIds?: readonly string[]
  /** The shared relay groups: relay id to group name. */
  groups?: Readonly<Record<string, string>>
  /** The shared list of group names, in display order. */
  groupList?: readonly string[]
  /** The shared order of relays inside a card. */
  order?: readonly string[]
  /** The shared entity icons, `<entity>/<id>` to a name; a relay with none wears the neutral one. */
  icons?: Readonly<Record<string, string>>
}

function Channel({
  id,
  relay,
  icon,
  frozen,
  phase,
  onPick,
  onRetry,
}: {
  id: string
  relay: Relay
  icon: string | undefined
  /** Driver not online, or Demo mode: nothing selected, controls disabled. */
  frozen: boolean
  phase: Phase | undefined
  onPick: (to: boolean) => void
  onRetry: (to: boolean) => void
}) {
  const { colors } = useTheme()
  const label = relay.name ?? id
  const unknown = frozen || relay.state === undefined
  const pending = !unknown && phase?.kind === 'pending'
  const failed = !unknown && phase?.kind === 'failed'
  // While pending the control shows the TARGET, so a tap is visibly acknowledged.
  const shown = pending ? phase.to : relay.state
  const selected = unknown || shown === undefined ? undefined : shown ? 'on' : 'off'

  return (
    <View style={styles.channel}>
      <View style={styles.channelTitle}>
        <View style={styles.channelName}>
          {/* A neutral glyph unless the owner picked one: the app never guesses what a channel switches. */}
          <EntityIcon name={icon} fallback={Power} size={16} color={colors.muted} />
          <Text
            numberOfLines={1}
            style={[
              styles.name,
              { color: relay.name === undefined ? colors.muted : colors.foreground },
            ]}
          >
            {label}
          </Text>
        </View>
        {pending && <ActivityIndicator size="small" color={colors.accent} />}
      </View>
      <Segmented
        label={label}
        options={SEGMENTS}
        selected={selected}
        disabled={unknown || pending}
        onSelect={(key) => {
          const to = key === 'on'
          // A re-tap of the selected segment sends nothing.
          if (to !== relay.state) onPick(to)
        }}
      />
      {unknown && <Text style={[styles.note, { color: colors.muted }]}>Unknown</Text>}
      {failed && (
        <View style={styles.failed}>
          <Text style={[styles.note, { color: colors.danger }]}>Didn&apos;t switch</Text>
          <Pressable
            accessibilityRole="button"
            android_ripple={{ color: colors.default }}
            hitSlop={12}
            onPress={() => onRetry(phase.to)}
            style={styles.retry}
          >
            <Text style={[styles.retryText, { color: colors.accent }]}>Retry</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

/**
 * The Relays tab's content: titled panels of labelled Off | On controls, one per channel. `state`
 * means the output was commanded and latched, never that the load is energised, so nothing here
 * says more than the bus does (hub ADR 0013).
 */
export function RelayPanels({
  relays,
  driverOnline,
  demo,
  onSetRelay,
  criticalIds = criticalRelayIds,
  groups = {},
  groupList = DEFAULT_RELAY_GROUP_LIST,
  order = [],
  icons = {},
}: RelayPanelsProps) {
  const { colors } = useTheme()
  const frozen = demo || !driverOnline
  const { phaseOf, request } = useCommandPhases(relays, frozen, onSetRelay)
  const ids = Object.keys(relays)

  const pick = (id: string, to: boolean) => {
    if (!criticalIds.includes(id)) return request(id, to)
    const verb = to ? 'on' : 'off'
    // The platform's own dialog. `request` re-checks `frozen`, so a prompt left open while the
    // Driver drops sends nothing.
    Alert.alert(`Switch ${verb} ${relays[id].name ?? id}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: `Switch ${verb}`, onPress: () => request(id, to) },
    ])
  }

  return (
    <>
      {demo ? (
        <Banner>Demo mode: controls are disabled.</Banner>
      ) : !driverOnline ? (
        <Banner>
          The relay driver is not online. Every relay is unknown and its controls are disabled.
        </Banner>
      ) : null}
      {panelsFor(ids, groups, groupList, order).map((panel) => (
        <Card key={panel.title} style={styles.panel}>
          <Text accessibilityRole="header" style={[styles.panelTitle, { color: colors.muted }]}>
            {panel.title}
          </Text>
          {panel.ids.map((id) => (
            <Channel
              key={id}
              id={id}
              relay={relays[id]}
              icon={icons[iconKey('relay', id)]}
              frozen={frozen}
              phase={phaseOf(id)}
              onPick={(to) => pick(id, to)}
              onRetry={(to) => request(id, to)}
            />
          ))}
        </Card>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  panel: { padding: 16, gap: 16, borderRadius: radius['2xl'] },
  panelTitle: { fontSize: 14, fontWeight: '500' },
  channel: { gap: 6 },
  channelTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 20,
  },
  channelName: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  name: { fontSize: 14, flexShrink: 1 },
  note: { fontSize: 12 },
  failed: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  retry: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 8 },
  retryText: { fontSize: 14, fontWeight: '600' },
})
