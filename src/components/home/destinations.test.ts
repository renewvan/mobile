import { LEVELS_PAGES } from '@/components/levels/pages'
import { destinationOf } from './destinations'

describe('destinationOf', () => {
  it('opens the Levels page that shows the type', () => {
    expect(destinationOf('tank')).toEqual({ pathname: '/levels', page: 'tanks' })
    expect(destinationOf('tilt')).toEqual({ pathname: '/levels', page: 'tilt' })
  })

  it('only names Levels pages that exist', () => {
    for (const type of ['tank', 'temperature', 'tilt'] as const) {
      const d = destinationOf(type)
      expect(LEVELS_PAGES.map((p) => p.id)).toContain('page' in d ? d.page : undefined)
    }
  })

  it('sends the router to its Settings screen and power to Energy', () => {
    expect(destinationOf('router')).toEqual({ settings: 'cellular' })
    expect(destinationOf('solar')).toEqual({ pathname: '/energy' })
  })
})
