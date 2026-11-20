import { capabilitiesOf } from '@/lib/capabilities'
import { emptyRenewvanBusState, type RenewvanBusState } from '@/types'
import { controlsSections } from './sections'

const capabilities = (partial: Partial<RenewvanBusState>) =>
  capabilitiesOf({ ...emptyRenewvanBusState, ...partial })

describe('controlsSections', () => {
  it('is empty when the van has no heater or relay', () => {
    expect(controlsSections(capabilities({}))).toEqual([])
  })

  it('lists only the present sections, heater first', () => {
    expect(
      controlsSections(
        capabilities({ relays: { a: {} as never }, heaters: { cabin: {} as never } }),
      ),
    ).toEqual(['heater', 'relays'])
    expect(controlsSections(capabilities({ relays: { a: {} as never } }))).toEqual(['relays'])
  })
})
