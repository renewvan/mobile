import type { Capability } from '@/lib/capabilities'
import type { EntityType } from '@/lib/drivers'

/** The Levels tab's pages, as the `page` param names them. */
export const LEVELS_PAGES = [
  { id: 'tanks', label: 'Tanks', capability: 'tank' },
  { id: 'temperature', label: 'Temperature', capability: 'temperature' },
  { id: 'tilt', label: 'Tilt', capability: 'tilt' },
] as const satisfies readonly { id: string; label: string; capability: EntityType }[]
export type LevelsPage = (typeof LEVELS_PAGES)[number]['id']

/** Only a present capability gets a pill; an offline one stays, so its last readings remain visible. */
export function availableLevelsPages(
  capabilities: Record<EntityType, Capability>,
): readonly (typeof LEVELS_PAGES)[number][] {
  return LEVELS_PAGES.filter((page) => capabilities[page.capability].state === 'present')
}

/** The page to show: the chosen one if present, else the first present one, else none. */
export function resolveLevelsPage(
  pages: readonly { id: LevelsPage }[],
  chosen: LevelsPage,
): LevelsPage | undefined {
  return pages.some((page) => page.id === chosen) ? chosen : pages[0]?.id
}
