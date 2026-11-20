import type { Battery } from '@/types'
import { batterySourceName } from './sourceName'

const battery = (o: Partial<Battery> = {}) => ({
  soc_pct: 80,
  voltage_v: 13.2,
  current_a: 1,
  power_w: 10,
  ...o,
})

describe('batterySourceName', () => {
  it('is the published name, trimmed', () => {
    expect(batterySourceName({ a: battery({ name: ' SmartShunt 500A ' }) })).toBe('SmartShunt 500A')
  })

  it('falls back to the id only when there are several batteries', () => {
    expect(batterySourceName({ a: battery() })).toBeUndefined()
    expect(batterySourceName({ a: battery(), b: battery() })).toBe('a')
  })

  it('has nothing without a complete battery', () => {
    expect(batterySourceName({})).toBeUndefined()
  })
})
