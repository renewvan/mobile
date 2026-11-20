import { emptyRenewvanBusState, type RenewvanBusState } from '@/types'
import { statusValue } from './statusValues'

const bus = (partial: Partial<RenewvanBusState>) => ({ ...emptyRenewvanBusState, ...partial })

describe('statusValue', () => {
  it('reads the battery charge, rounded, and dots while it has not reported', () => {
    expect(statusValue('battery', bus({ batteries: { a: { soc_pct: 86.6 } as never } }))).toBe(
      '87%',
    )
    expect(statusValue('battery', bus({ batteries: { a: {} as never } }))).toBe('…')
  })

  it('sums solar watts and counts relays that are on', () => {
    const solar = { a: { power_w: 100.4 } as never, b: { power_w: 20 } as never }
    expect(statusValue('solar', bus({ solar }))).toBe('120 W')
    const relays = {
      a: { state: true } as never,
      b: { state: false } as never,
      c: { state: true } as never,
    }
    expect(statusValue('relay', bus({ relays }))).toBe('2/3')
  })
})
