import { emptyRenewvanBusState, type RenewvanBusState } from '@/types'
import type { Capability } from '@/lib/capabilities'
import { ENTITY_TYPES, type EntityType } from '@/lib/drivers'
import type { GroupId } from '@/lib/widgets'
import { groupTiles } from './groupTiles'

function fixture(
  present: readonly EntityType[],
  entities: Partial<RenewvanBusState>,
): { capabilities: Record<EntityType, Capability>; state: RenewvanBusState } {
  const capabilities = Object.fromEntries(
    ENTITY_TYPES.map(({ type }) => [
      type,
      {
        state: present.includes(type) ? 'present' : 'absent',
        count: 0,
        offline: false,
        controllable: true,
      },
    ]),
  ) as Record<EntityType, Capability>
  return { capabilities, state: { ...emptyRenewvanBusState, ...entities } }
}

function tiles(id: GroupId, present: readonly EntityType[], entities: Partial<RenewvanBusState>) {
  const { capabilities, state } = fixture(present, entities)
  return groupTiles(id, capabilities, state)
}

describe('groupTiles', () => {
  it('gives a lone device one named, full-width tile', () => {
    expect(
      tiles('energy', ['battery'], {
        batteries: { house: { name: 'House', soc_pct: 80 } as never },
      }),
    ).toEqual([{ key: 'battery:house', type: 'battery', id: 'house', label: 'House', wide: true }])
  })

  it('returns to two columns when another device joins the group', () => {
    expect(
      tiles('energy', ['battery', 'solar'], {
        batteries: { house: { soc_pct: 80 } as never },
        solar: { roof: { power_w: 100 } as never },
      }),
    ).toEqual([
      { key: 'battery:house', type: 'battery', id: 'house', label: 'Batteries', wide: false },
      { key: 'solar:roof', type: 'solar', id: 'roof', label: 'Solar Chargers', wide: false },
    ])
  })

  it('makes one tile per relay, using ids to distinguish unnamed relays', () => {
    expect(
      tiles('controls', ['relay'], {
        relays: { relay_01: { state: false }, relay_02: { state: true } },
      }),
    ).toEqual([
      { key: 'relay:relay_01', type: 'relay', id: 'relay_01', label: 'relay_01', wide: false },
      { key: 'relay:relay_02', type: 'relay', id: 'relay_02', label: 'relay_02', wide: false },
    ])
  })

  it('keeps a placeholder for a published type whose entities have not arrived', () => {
    expect(tiles('water', ['tank'], {})).toEqual([
      { key: 'tank', type: 'tank', label: 'Tanks', wide: false },
    ])
  })
})
