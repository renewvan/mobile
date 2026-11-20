import { router } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { Commands } from '@/bus/commands'
import { openSettings } from '@/components/settings/routes'
import { destinationOf, type CircleType } from '@/components/home/destinations'
import {
  groupTiles,
  hasReading,
  type GroupTile,
  type RelayLayout,
} from '@/components/home/groupTiles'
import { statusValue } from '@/components/home/statusValues'
import { TYPE_ICONS } from '@/components/home/typeMeta'
import { useCommandPhases } from '@/components/relays/useCommandPhases'
import { batteryDial } from '@/components/start/batteryDial'
import { TitledCard } from '@/components/ui'
import type { Capability } from '@/lib/capabilities'
import { ENTITY_TYPES, type EntityType } from '@/lib/drivers'
import { GROUPS, type GroupId } from '@/lib/widgets'
import { alpha, layout, radius, useTheme } from '@/theme'
import type { Battery, RenewvanBusState } from '@/types'

const LABELS = Object.fromEntries(ENTITY_TYPES.map((e) => [e.type, e.label])) as Record<
  EntityType,
  string
>

/** Opens a circle's destination. `at` changes on every tap so Levels can be asked for the same page twice. */
function open(type: CircleType, present: boolean) {
  if (!present) return
  const d = destinationOf(type)
  if ('settings' in d) openSettings(d.settings)
  else if ('page' in d) {
    router.navigate({ pathname: d.pathname, params: { page: d.page, at: String(Date.now()) } })
  } else router.navigate(d.pathname)
}

/**
 * One flat, scrolling row in group order: a circle per entity type with its reading and name,
 * dimmed with a dash when the van has none, or 'Offline' when its driver is offline. Position is
 * not here: the map widget covers it.
 */
export function StatusCircles({
  capabilities,
  hidden,
  values,
}: {
  capabilities: Record<EntityType, Capability>
  hidden: readonly EntityType[]
  /** Each type's reading, from `statusValue`. */
  values: Record<EntityType, string>
}) {
  const { colors } = useTheme()
  const types = GROUPS.flatMap((g) => g.types).filter(
    (t): t is CircleType => t !== 'gps' && !hidden.includes(t),
  )
  if (types.length === 0) return null
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.circles}
    >
      {types.map((type) => {
        const { state: presence, offline } = capabilities[type]
        const Icon = TYPE_ICONS[type]
        const present = presence === 'present'
        const value = !present ? '–' : offline ? 'Offline' : values[type]
        return (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={`${LABELS[type]}: ${present ? value : 'not installed'}`}
            onPress={() => open(type, present)}
            style={[styles.col, { opacity: present && !offline ? 1 : present ? 0.55 : 0.4 }]}
          >
            <View
              style={[
                styles.circle,
                { backgroundColor: alpha(colors.accent, present ? 0.18 : 0.06) },
              ]}
            >
              <Icon size={22} color={present ? colors.accent : colors.muted} />
            </View>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 12 }}>
              {value}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11 }}>
              {LABELS[type]}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function BatteryDetail({ battery }: { battery: Battery }) {
  const { colors } = useTheme()
  const view = batteryDial({ battery }, colors)
  if (!view) return null
  return (
    <>
      <View style={[styles.levelTrack, { backgroundColor: alpha(colors.foreground, 0.1) }]}>
        <View
          style={[
            styles.levelFill,
            { backgroundColor: view.color, width: `${view.pct}%` as `${number}%` },
          ]}
        />
      </View>
      {view.timeToGo || view.state ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {view.timeToGo ? `${view.timeToGo} left` : view.state}
        </Text>
      ) : null}
    </>
  )
}

function RelayTiles({
  tiles,
  state,
  controllable,
  demoMode,
  commands,
}: {
  tiles: GroupTile[]
  state: RenewvanBusState
  controllable: boolean
  demoMode: boolean
  commands: Pick<Commands, 'setRelay'>
}) {
  const { colors } = useTheme()
  const frozen = demoMode || !controllable
  const { phaseOf, request } = useCommandPhases(state.relays, frozen, commands.setRelay)
  const Icon = TYPE_ICONS.relay
  return (
    <>
      {tiles.map((tile) => {
        const relay = tile.id === undefined ? undefined : state.relays[tile.id]
        const phase = tile.id === undefined ? undefined : phaseOf(tile.id)
        const unknown = frozen || relay?.state === undefined
        const pending = !unknown && phase?.kind === 'pending'
        const failed = !unknown && phase?.kind === 'failed'
        const shown = pending ? phase.to : relay?.state
        return (
          <Pressable
            key={tile.key}
            accessibilityRole="button"
            accessibilityLabel={`${tile.label}: ${unknown ? 'Unknown' : pending ? `Switching ${shown ? 'on' : 'off'}` : failed ? "Didn't switch" : shown ? 'On' : 'Off'}`}
            accessibilityState={{ disabled: unknown || pending, busy: pending }}
            android_ripple={{ color: colors.default }}
            disabled={unknown || pending}
            onPress={() => {
              if (tile.id !== undefined && relay?.state !== undefined) {
                request(tile.id, !relay.state)
              }
            }}
            style={[
              styles.tile,
              tile.wide && styles.wideTile,
              {
                backgroundColor: alpha(colors.foreground, 0.05),
                opacity: frozen ? 0.55 : 1,
              },
            ]}
          >
            <View style={styles.tileHeader}>
              <Icon size={18} color={shown ? colors.accent : colors.muted} />
              {pending && <ActivityIndicator size="small" color={colors.accent} />}
            </View>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '500' }}>
              {tile.label}
            </Text>
            <Text style={{ color: failed ? colors.danger : colors.muted, fontSize: 12 }}>
              {unknown ? 'Unknown' : failed ? "Didn't switch" : shown ? 'On' : 'Off'}
            </Text>
          </Pressable>
        )
      })}
    </>
  )
}

/** A group's card: one tile per device, with the lone device using the full width. */
export function GroupCard({
  id,
  capabilities,
  state,
  demoMode,
  commands,
  relayLayout,
}: {
  id: GroupId
  capabilities: Record<EntityType, Capability>
  state: RenewvanBusState
  relayLayout: RelayLayout
  demoMode: boolean
  commands: Pick<Commands, 'setRelay'>
}) {
  const { colors } = useTheme()
  const group = GROUPS.find((g) => g.id === id)!
  const tiles = groupTiles(id, capabilities, state, relayLayout)
  return (
    <TitledCard title={group.label}>
      <View style={styles.tiles}>
        {id === 'controls' ? (
          <RelayTiles
            tiles={tiles}
            state={state}
            controllable={capabilities.relay.controllable}
            demoMode={demoMode}
            commands={commands}
          />
        ) : (
          tiles.map((tile) => {
            const Icon = TYPE_ICONS[tile.type]
            const { offline } = capabilities[tile.type]
            const battery =
              tile.wide && tile.type === 'battery' && tile.id !== undefined
                ? state.batteries[tile.id]
                : undefined
            return (
              <View
                key={tile.key}
                style={[
                  styles.tile,
                  tile.wide && styles.wideTile,
                  {
                    backgroundColor: alpha(colors.foreground, 0.05),
                    opacity: offline ? 0.55 : 1,
                  },
                ]}
              >
                <Icon size={18} color={colors.muted} />
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '500' }}>
                  {tile.label}
                </Text>
                {tile.wide && hasReading(tile.type) ? (
                  <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: '600' }}>
                    {statusValue(tile.type, state)}
                  </Text>
                ) : null}
                {battery ? <BatteryDetail battery={battery} /> : null}
                {offline ? (
                  <Text style={{ color: colors.muted, fontSize: 12 }}>Offline</Text>
                ) : null}
              </View>
            )
          })
        )}
      </View>
    </TitledCard>
  )
}

/** Stands in for a widget until the bus has settled. */
export function Skeleton({ height = 96 }: { height?: number }) {
  const { colors } = useTheme()
  return (
    <View
      accessibilityLabel="Loading"
      style={{
        height,
        borderRadius: layout.radius,
        backgroundColor: alpha(colors.foreground, 0.06),
      }}
    />
  )
}

const styles = StyleSheet.create({
  circles: { gap: 12 },
  col: { alignItems: 'center', gap: 4, width: 72 },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: 12,
    gap: 4,
    borderRadius: radius['3xl'],
    overflow: 'hidden',
  },
  wideTile: { flexBasis: '100%' },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 20,
  },
  levelTrack: { height: 6, borderRadius: radius.lg, overflow: 'hidden', marginTop: 4 },
  levelFill: { height: '100%', borderRadius: radius.lg },
})
