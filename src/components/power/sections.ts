import type { Capability } from '@/lib/capabilities'
import type { EntityType } from '@/lib/drivers'

export type EnergySection = 'power' | 'solar' | 'chargers'

/** The Energy cards the van has, in a fixed order. */
export function energySections(capabilities: Record<EntityType, Capability>): EnergySection[] {
  const sections: [EnergySection, EntityType][] = [
    ['power', 'battery'],
    ['solar', 'solar'],
    ['chargers', 'charger'],
  ]
  return sections.filter(([, type]) => capabilities[type].state === 'present').map(([id]) => id)
}
