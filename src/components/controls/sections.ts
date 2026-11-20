import type { Capability } from '@/lib/capabilities'
import type { EntityType } from '@/lib/drivers'

export type ControlsSection = 'heater' | 'relays'

/** The Controls sections the van has, heater first. */
export function controlsSections(capabilities: Record<EntityType, Capability>): ControlsSection[] {
  const sections: ControlsSection[] = []
  if (capabilities.heater.state === 'present') sections.push('heater')
  if (capabilities.relay.state === 'present') sections.push('relays')
  return sections
}
