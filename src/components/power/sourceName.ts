import { completeBatteryIds, primaryBattery } from '@/lib/primaryBattery'
import type { Battery } from '@/types'

/**
 * Which battery a card reads, for the card header's right side: its published name (`SmartShunt
 * 500A`), or its id when there are several and it has none. Nothing when it cannot say.
 */
export function batterySourceName(
  batteries: Record<string, Partial<Battery>>,
  selection?: string,
): string | undefined {
  const primary = primaryBattery(batteries, selection)
  if (!primary) return undefined
  const several = completeBatteryIds(batteries).length > 1
  return primary.battery.name?.trim() || (several ? primary.id : undefined)
}
