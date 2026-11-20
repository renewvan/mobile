/** The Levels tab's pages, as the `page` param names them. */
export const LEVELS_PAGES = [
  { id: 'tanks', label: 'Tanks' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'tilt', label: 'Tilt' },
] as const
export type LevelsPage = (typeof LEVELS_PAGES)[number]['id']
