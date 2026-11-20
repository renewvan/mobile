import { StyleSheet, Text, View } from 'react-native'
import { TYPE_ICONS } from '@/components/home/typeMeta'
import { TitledCard } from '@/components/ui'
import type { Capability } from '@/lib/capabilities'
import { ENTITY_TYPES, type EntityType } from '@/lib/drivers'
import { GROUPS, type GroupId } from '@/lib/widgets'
import { alpha, layout, radius, useTheme } from '@/theme'

const LABELS = Object.fromEntries(ENTITY_TYPES.map((e) => [e.type, e.label])) as Record<
  EntityType,
  string
>

/** One flat row, in group order: a circle per entity type, dimmed when the van has none (or its driver is offline). */
export function StatusCircles({
  capabilities,
  hidden,
}: {
  capabilities: Record<EntityType, Capability>
  hidden: readonly EntityType[]
}) {
  const { colors } = useTheme()
  const types = GROUPS.flatMap((g) => g.types).filter((t) => !hidden.includes(t))
  return (
    <View style={styles.circles}>
      {types.map((type) => {
        const { state, offline } = capabilities[type]
        const Icon = TYPE_ICONS[type]
        const on = state === 'present' && !offline
        return (
          <View
            key={type}
            accessible
            accessibilityLabel={`${LABELS[type]}: ${state === 'present' ? (offline ? 'offline' : 'present') : 'none'}`}
            style={[
              styles.circle,
              {
                backgroundColor: alpha(colors.accent, 0.15),
                opacity: on ? 1 : state === 'present' ? 0.55 : 0.3,
              },
            ]}
          >
            <Icon size={18} color={on ? colors.accent : colors.muted} />
          </View>
        )
      })}
    </View>
  )
}

/** A group's card: a tile for each of its entity types the van has. Hidden by the caller when it has none. */
export function GroupCard({
  id,
  capabilities,
}: {
  id: GroupId
  capabilities: Record<EntityType, Capability>
}) {
  const { colors } = useTheme()
  const group = GROUPS.find((g) => g.id === id)!
  const present = group.types.filter((t) => capabilities[t].state === 'present')
  return (
    <TitledCard title={group.label}>
      <View style={styles.tiles}>
        {present.map((type) => {
          const Icon = TYPE_ICONS[type]
          const { count, offline } = capabilities[type]
          return (
            <View
              key={type}
              style={[
                styles.tile,
                { backgroundColor: alpha(colors.foreground, 0.05), opacity: offline ? 0.55 : 1 },
              ]}
            >
              <Icon size={18} color={colors.muted} />
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '500' }}>
                {LABELS[type]}
              </Text>
              {count > 0 ? (
                <Text style={{ color: colors.muted, fontSize: 12 }}>{count}</Text>
              ) : null}
            </View>
          )
        })}
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
  circles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexGrow: 1, flexBasis: '45%', padding: 12, gap: 4, borderRadius: radius['3xl'] },
})
