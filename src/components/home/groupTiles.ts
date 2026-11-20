import type { Capability } from '@/lib/capabilities'
import { ENTITY_TYPES, type EntityType } from '@/lib/drivers'
import { panelsFor } from '@/config/relayPanels'
import { GROUPS, type GroupId } from '@/lib/widgets'
import type { RenewvanBusState } from '@/types'

export interface GroupTile {
  key: string
  type: EntityType
  id?: string
  label: string
  wide: boolean
}

/** The types whose lone tile has a real big reading; any other is a plain full-width tile. */
const READING_TYPES: readonly EntityType[] = ['battery', 'solar', 'temperature', 'tilt', 'router']

export const hasReading = (type: EntityType) => READING_TYPES.includes(type)

/** The shared relay settings that decide the Controls tab's order. */
export interface RelayLayout {
  groups: Readonly<Record<string, string>>
  list: readonly string[]
  order: readonly string[]
}

/** One tile per device; relays run in the Controls tab's order (group, then shared relay order). A published type keeps its placeholder while its first record is arriving. */
export function groupTiles(
  id: GroupId,
  capabilities: Record<EntityType, Capability>,
  state: RenewvanBusState,
  relayLayout: RelayLayout = { groups: {}, list: [], order: [] },
): GroupTile[] {
  const group = GROUPS.find((g) => g.id === id)!
  const tiles = group.types
    .filter((type) => capabilities[type].state === 'present')
    .flatMap((type): GroupTile[] => {
      const entity = ENTITY_TYPES.find((e) => e.type === type)!
      const records = Object.entries(state[entity.field])
      if (type === 'relay') {
        const { groups, list, order } = relayLayout
        const ranked = panelsFor(Object.keys(state.relays), groups, list, order).flatMap(
          (p) => p.ids,
        )
        records.sort(([a], [b]) => ranked.indexOf(a) - ranked.indexOf(b))
      }
      if (records.length === 0) return [{ key: type, type, label: entity.label, wide: false }]
      return records.map(([id, record]) => ({
        key: `${type}:${id}`,
        type,
        id,
        label: record.name ?? (records.length === 1 ? entity.label : id),
        wide: false,
      }))
    })
  return tiles.length === 1 && tiles[0].id !== undefined ? [{ ...tiles[0], wide: true }] : tiles
}
