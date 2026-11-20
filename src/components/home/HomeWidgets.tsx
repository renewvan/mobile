import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { statusValue } from '@/components/home/statusValues'
import type { RenewvanBusState } from '@/types'
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

/** The tab a type's circle opens. */
const TAB: Record<EntityType, string> = {
  battery: '/energy',
  solar: '/energy',
  charger: '/energy',
  relay: '/controls',
  heater: '/controls',
  tank: '/levels',
  temperature: '/levels',
  tilt: '/levels',
  router: '/settings',
  gps: '/settings',
}

/**
 * One flat, scrolling row in group order: a circle per entity type with its reading and name,
 * dimmed with a dash when the van has none (or its driver is offline). Position is not here: the
 * map widget covers it.
 */
export function StatusCircles({
  capabilities,
  hidden,
  state,
}: {
  capabilities: Record<EntityType, Capability>
  hidden: readonly EntityType[]
  state: RenewvanBusState
}) {
  const { colors } = useTheme()
  const types = GROUPS.flatMap((g) => g.types).filter((t) => t !== 'gps' && !hidden.includes(t))
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
        const value = present ? statusValue(type, state) : '–'
        return (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={`${LABELS[type]}: ${present ? `${value}${offline ? ', offline' : ''}` : 'not installed'}`}
            onPress={() => router.navigate(TAB[type] as never)}
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
  circles: { gap: 12 },
  col: { alignItems: 'center', gap: 4, width: 64 },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexGrow: 1, flexBasis: '45%', padding: 12, gap: 4, borderRadius: radius['3xl'] },
})
