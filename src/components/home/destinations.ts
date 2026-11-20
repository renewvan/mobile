import type { LevelsPage } from '@/components/levels/pages'
import type { SettingsView } from '@/components/settings/routes'
import type { EntityType } from '@/lib/drivers'

/** The types that get a status circle: position is the map widget's job. */
export type CircleType = Exclude<EntityType, 'gps'>

export type Destination =
  | { pathname: '/energy' | '/controls' }
  | { pathname: '/levels'; page: LevelsPage }
  | { settings: SettingsView }

/** Where a type's circle goes: the tab, and the page inside it when the tab has several. */
export function destinationOf(type: CircleType): Destination {
  switch (type) {
    case 'battery':
    case 'solar':
    case 'charger':
      return { pathname: '/energy' }
    case 'relay':
    case 'heater':
      return { pathname: '/controls' }
    case 'tank':
      return { pathname: '/levels', page: 'tanks' }
    case 'temperature':
    case 'tilt':
      return { pathname: '/levels', page: type }
    case 'router':
      return { settings: 'cellular' }
  }
}
