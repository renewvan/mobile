import type { Capability } from '@/lib/capabilities'
import type { EntityType } from '@/lib/drivers'

/**
 * The Start page widget catalogue and the group table: what a client can draw and what it needs from the
 * van. Pure data and one pure function, no UI, shared with the mobile app (it copies `src/lib`).
 * Layout storage, rendering and navigation stay with each app.
 */

export type GroupId = 'energy' | 'controls' | 'water' | 'climate' | 'van'

/** The one fixed table from entity type to group, in the order the groups are shown. */
export const GROUPS: readonly { id: GroupId; label: string; types: readonly EntityType[] }[] = [
  { id: 'energy', label: 'Energy', types: ['battery', 'solar', 'charger'] },
  { id: 'controls', label: 'Controls', types: ['relay'] },
  { id: 'water', label: 'Water', types: ['tank'] },
  { id: 'climate', label: 'Climate', types: ['heater', 'temperature'] },
  { id: 'van', label: 'Van', types: ['gps', 'tilt', 'router'] },
]

export function groupOf(type: EntityType): GroupId {
  const group = GROUPS.find((g) => g.types.includes(type))
  if (!group) throw new Error(`entity type ${type} is in no group`)
  return group.id
}

/** What a widget needs: nothing (`always`), every listed type (`all`), or at least one (`any`). */
export type WidgetNeeds = 'always' | { all: readonly EntityType[] } | { any: readonly EntityType[] }

export type WidgetId =
  | 'status'
  | 'map'
  | 'group-energy'
  | 'group-controls'
  | 'group-water'
  | 'group-climate'
  | 'group-van'
  | 'battery'
  | 'power-flow'
  | 'solar'
  | 'heater'
  | 'temperature'
  | 'tilt'
  | 'fresh-water'
  | 'grey-water'

export interface WidgetDef {
  id: WidgetId
  label: string
  needs: WidgetNeeds
  /** On for a new layout; the rest are optional full cards. */
  defaultOn: boolean
}

const groupCard = (id: GroupId): WidgetDef => {
  const group = GROUPS.find((g) => g.id === id)!
  return { id: `group-${id}`, label: group.label, needs: { any: group.types }, defaultOn: true }
}

/** Every widget, in default order: the on-by-default ones first, then the optional full cards. */
export const WIDGETS: readonly WidgetDef[] = [
  // `status` is the circles; `map` falls back to the phone's own GPS, so neither needs a driver.
  { id: 'status', label: 'Status', needs: 'always', defaultOn: true },
  { id: 'map', label: 'Map', needs: 'always', defaultOn: true },
  ...GROUPS.map((g) => groupCard(g.id)),
  { id: 'battery', label: 'Battery', needs: { all: ['battery'] }, defaultOn: false },
  { id: 'power-flow', label: 'Power flow', needs: { all: ['battery'] }, defaultOn: false },
  { id: 'solar', label: 'Solar', needs: { all: ['solar'] }, defaultOn: false },
  { id: 'heater', label: 'Heater', needs: { all: ['heater'] }, defaultOn: false },
  { id: 'temperature', label: 'Temperature', needs: { all: ['temperature'] }, defaultOn: false },
  { id: 'tilt', label: 'Tilt', needs: { all: ['tilt'] }, defaultOn: false },
  { id: 'fresh-water', label: 'Fresh water', needs: { all: ['tank'] }, defaultOn: false },
  { id: 'grey-water', label: 'Grey water', needs: { all: ['tank'] }, defaultOn: false },
]

export const DEFAULT_WIDGET_IDS: readonly WidgetId[] = WIDGETS.filter((w) => w.defaultOn).map(
  (w) => w.id,
)

export type WidgetAvailability = 'loading' | 'available' | 'unavailable'

/**
 * Whether the van has what a widget needs. `loading` while a needed type has no evidence and the
 * bus has not settled (show a skeleton); `unavailable` once it has. An offline Driver is still
 * `available`: its widget stays, dimmed. Availability is never stored, only derived at render.
 */
export function widgetAvailability(
  id: WidgetId,
  capabilities: Record<EntityType, Capability>,
): WidgetAvailability {
  const { needs } = WIDGETS.find((w) => w.id === id)!
  if (needs === 'always') return 'available'
  const types = 'all' in needs ? needs.all : needs.any
  const states = types.map((t) => capabilities[t].state)
  const met = 'all' in needs ? states.every((s) => s === 'present') : states.includes('present')
  if (met) return 'available'
  return states.includes('loading') ? 'loading' : 'unavailable'
}
