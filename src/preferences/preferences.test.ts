import {
  DEFAULT_PREFERENCES,
  DEFAULT_START_LAYOUT,
  isDefaultLayout,
  moved,
  parsePreferences,
} from './preferences'

describe('parsePreferences', () => {
  it('gives the defaults when nothing, or nothing readable, was stored', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences('not json')).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences('[1,2]')).toEqual(DEFAULT_PREFERENCES)
  })

  it('reads back what was stored', () => {
    const stored = {
      theme: 'dark',
      startLayout: ['heater', 'energy'],
      hiddenTemperatures: ['pi_cpu'],
      devicesSort: 'entity',
      powerLayout: 'van-orbs',
      van: { name: 'Olga', brand: 'Fiat', model: 'Ducato', kms: '120000', plate: 'FR-RV 1' },
    }
    expect(parsePreferences(JSON.stringify(stored))).toEqual(stored)
  })

  it('checks each field on its own, so one bad value does not lose the rest', () => {
    const parsed = parsePreferences(
      JSON.stringify({ theme: 'sepia', devicesSort: 'entity', van: { name: 'Olga', kms: 12 } }),
    )
    expect(parsed.theme).toBe('system')
    expect(parsed.devicesSort).toBe('entity')
    expect(parsed.powerLayout).toBe('van-tiles')
    expect(parsed.startLayout).toEqual(DEFAULT_START_LAYOUT)
    expect(parsed.van).toEqual({ name: 'Olga', brand: '', model: '', kms: '', plate: '' })
  })

  it('drops widgets it does not know and repeats, but keeps an empty layout as a choice', () => {
    const layout = (startLayout: unknown) =>
      parsePreferences(JSON.stringify({ startLayout })).startLayout
    expect(layout(['tilt', 'weather', 'tilt', 'solar'])).toEqual(['tilt', 'solar'])
    expect(layout([])).toEqual([])
    expect(layout('tilt')).toEqual(DEFAULT_START_LAYOUT)
  })
})

describe('powerLayout', () => {
  it('keeps a layout the app draws and falls back to Van tiles for any other', () => {
    const layout = (powerLayout: unknown) =>
      parsePreferences(JSON.stringify({ powerLayout })).powerLayout
    expect(layout('van-orbs')).toBe('van-orbs')
    // The dashboard's layouts without the van are not drawn here.
    expect(layout('orbs')).toBe('van-tiles')
    expect(layout(3)).toBe('van-tiles')
  })
})

describe('moved', () => {
  it('moves one item and leaves the rest in order', () => {
    expect(moved(['a', 'b', 'c', 'd'], 2, 0)).toEqual(['c', 'a', 'b', 'd'])
    expect(moved(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('returns the same list for a move that goes nowhere or out of range', () => {
    const list = ['a', 'b']
    expect(moved(list, 0, 0)).toBe(list)
    expect(moved(list, 0, 2)).toBe(list)
    expect(moved(list, -1, 1)).toBe(list)
  })
})

describe('isDefaultLayout', () => {
  it('is true only for the shipped widgets in the shipped order', () => {
    expect(isDefaultLayout(DEFAULT_START_LAYOUT)).toBe(true)
    expect(isDefaultLayout(moved(DEFAULT_START_LAYOUT, 0, 1))).toBe(false)
    expect(isDefaultLayout(DEFAULT_START_LAYOUT.slice(1))).toBe(false)
  })
})
