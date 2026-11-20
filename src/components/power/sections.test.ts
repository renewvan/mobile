import { capabilitiesOf } from '@/lib/capabilities'
import { emptyRenewvanBusState, type RenewvanBusState } from '@/types'
import { energySections } from './sections'

const capabilities = (partial: Partial<RenewvanBusState>) =>
  capabilitiesOf({ ...emptyRenewvanBusState, ...partial })

describe('energySections', () => {
  it('is empty when the van has no energy device', () => {
    expect(energySections(capabilities({}))).toEqual([])
  })

  it('lists only the present sections, in a fixed order', () => {
    expect(
      energySections(
        capabilities({ chargers: { a: {} as never }, batteries: { house: {} as never } }),
      ),
    ).toEqual(['power', 'chargers'])
    expect(energySections(capabilities({ solar: { roof: {} as never } }))).toEqual(['solar'])
  })
})
