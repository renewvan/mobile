import { useMemo } from 'react'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { capabilitiesOf, type Capability } from '@/lib/capabilities'
import type { EntityType } from '@/lib/drivers'

/**
 * What the van has of each entity type. Nothing reads absent before the bus has settled, and while
 * the hub link is down nothing reads offline: the banner says so, a dimmed widget would repeat it.
 */
export function useCapabilities(): Record<EntityType, Capability> {
  const { state, settled, status } = useRenewvanBus()
  return useMemo(() => {
    const capabilities = capabilitiesOf(state, settled)
    if (status === 'connected') return capabilities
    return Object.fromEntries(
      Object.entries(capabilities).map(([type, c]) => [type, { ...c, offline: false }]),
    ) as Record<EntityType, Capability>
  }, [state, settled, status])
}
