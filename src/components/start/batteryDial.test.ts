import type { Battery } from '@/types'
import { batteryDial } from './batteryDial'

const colors = { accent: '#blue', danger: '#red' }
const battery = (o: Partial<Battery> = {}): Battery => ({
  soc_pct: 80,
  voltage_v: 13.2,
  current_a: 2.6,
  power_w: 35,
  ...o,
})

describe('batteryDial', () => {
  it('names the source when it publishes a name', () => {
    expect(batteryDial({ a: battery({ name: ' SmartShunt 500A ' }) }, colors)?.source).toBe(
      'SmartShunt 500A',
    )
    expect(batteryDial({ a: battery() }, colors)?.source).toBeUndefined()
  })

  it('has nothing until a battery is complete', () => {
    expect(batteryDial({}, colors)).toBeUndefined()
    expect(batteryDial({ a: { soc_pct: 50 } }, colors)).toBeUndefined()
  })

  it('colours by charge: blue above 40, amber to 40, red to 20', () => {
    const color = (soc_pct: number) => batteryDial({ a: battery({ soc_pct }) }, colors)?.color
    expect(color(41)).toBe('#blue')
    expect(color(40)).toBe('#f59e0b')
    expect(color(20)).toBe('#red')
  })

  it('charging pulses and names its state; the sub line is volts and absolute watts', () => {
    expect(batteryDial({ a: battery() }, colors)).toMatchObject({
      charging: true,
      state: 'Charging',
      sub: '13.20V / 35W',
    })
  })

  it('discharging shows the runtime instead of the state', () => {
    const view = batteryDial({ a: battery({ power_w: -40, time_to_go_s: 90_000 }) }, colors)
    expect(view).toMatchObject({ charging: false, timeToGo: '1d 1h', state: undefined })
    expect(view?.sub).toBe('13.20V / 40W')
  })

  it('discharging with no estimate falls back to the state', () => {
    expect(batteryDial({ a: battery({ power_w: -40 }) }, colors)?.state).toBe('Discharging')
  })
})
