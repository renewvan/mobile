import { capabilitiesOf } from '@/lib/capabilities'
import { emptyRenewvanBusState, type RenewvanBusState } from '@/types'
import { availableLevelsPages, resolveLevelsPage } from './pages'

function capabilities(partial: Partial<RenewvanBusState>) {
  return capabilitiesOf({ ...emptyRenewvanBusState, ...partial })
}

describe('availableLevelsPages', () => {
  it('shows only the pills whose capability is present', () => {
    const pages = availableLevelsPages(capabilities({ temperatures: { outside: {} as never } }))
    expect(pages.map((page) => page.id)).toEqual(['temperature'])
    expect(availableLevelsPages(capabilities({ solar: { roof: {} as never } }))).toEqual([])
  })

  it('keeps every present page in the fixed order', () => {
    const pages = availableLevelsPages(
      capabilities({
        tilt: { van: {} as never },
        tanks: { fresh: {} as never },
        temperatures: { outside: {} as never },
      }),
    )
    expect(pages.map((page) => page.id)).toEqual(['tanks', 'temperature', 'tilt'])
  })

  it('keeps an offline capability present', () => {
    const pages = availableLevelsPages(
      capabilities({
        drivers: {
          tilt: {
            health: 'offline',
            info: {
              driver: 'tilt',
              product: 'Tilt',
              source: 'test',
              version: 'v1',
              publishes: ['tilt'],
            },
          },
        },
      }),
    )
    expect(pages.map((page) => page.id)).toEqual(['tilt'])
  })
})

describe('resolveLevelsPage', () => {
  const pages = availableLevelsPages(
    capabilities({ temperatures: { outside: {} as never }, tilt: { van: {} as never } }),
  )

  it('keeps the chosen page when it is present', () => {
    expect(resolveLevelsPage(pages, 'tilt')).toBe('tilt')
  })

  it('falls back to the first present page when the chosen one is absent', () => {
    expect(resolveLevelsPage(pages, 'tanks')).toBe('temperature')
  })

  it('is undefined when no page is present', () => {
    expect(resolveLevelsPage([], 'tanks')).toBeUndefined()
  })
})
