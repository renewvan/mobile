import type { Capability } from '@/lib/capabilities'
import { ENTITY_TYPES, type EntityType } from '@/lib/drivers'
import { GROUPS, type GroupId } from '@/lib/widgets'
import type { RenewvanBusState } from '@/types'

export interface GroupTile {
  key: string
  type: EntityType
  id?: string
  label: string
  wide: boolean
}

/** One tile per device. A published type keeps its placeholder while its first record is arriving. */
export function groupTiles(
  id: GroupId,
  capabilities: Record<EntityType, Capability>,
  state: RenewvanBusState,
): GroupTile[] {
  const group = GROUPS.find((g) => g.id === id)!
  const tiles = group.types
    .filter((type) => capabilities[type].state === 'present')
    .flatMap((type): GroupTile[] => {
      const entity = ENTITY_TYPES.find((e) => e.type === type)!
      const records = Object.entries(state[entity.field])
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
