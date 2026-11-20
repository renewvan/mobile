import { emptyRenewvanBusState, type RenewvanBusState } from '@/types'
import { capabilitiesOf } from './capabilities'
import {
  DEFAULT_WIDGET_IDS,
  GROUPS,
  WIDGETS,
  groupOf,
  widgetAvailability,
  type WidgetId,
} from './widgets'

const withState = (partial: Partial<RenewvanBusState>, settled = true) =>
  capabilitiesOf({ ...emptyRenewvanBusState, ...partial }, settled)
const rec = { a: {} as never }

describe('catalogue', () => {
  it('turns on by default: status, map, then the five group cards', () => {
    expect(DEFAULT_WIDGET_IDS).toEqual([
      'status',
      'map',
      'group-energy',
      'group-controls',
      'group-water',
      'group-climate',
      'group-van',
    ])
  })

  it('lists the optional full cards after the defaults, off by default', () => {
    const optional = WIDGETS.filter((w) => !w.defaultOn).map((w) => w.id)
    expect(optional).toEqual([
      'battery',
      'power-flow',
      'solar',
      'heater',
      'temperature',
      'tilt',
      'fresh-water',
      'grey-water',
    ])
    expect(WIDGETS.map((w) => w.id).slice(0, 7)).toEqual(DEFAULT_WIDGET_IDS)
  })

  it('has unique ids and a label for each', () => {
    const ids = WIDGETS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const w of WIDGETS) expect(w.label).not.toBe('')
  })

  it('puts every one of the ten entity types in exactly one group', () => {
    const types = GROUPS.flatMap((g) => g.types)
    expect(types.sort()).toEqual([
      'battery',
      'charger',
      'gps',
      'heater',
      'relay',
      'router',
      'solar',
      'tank',
      'temperature',
      'tilt',
    ])
    expect(GROUPS.map((g) => g.label)).toEqual(['Energy', 'Controls', 'Water', 'Climate', 'Van'])
    expect(groupOf('tank')).toBe('water')
    expect(groupOf('heater')).toBe('climate')
    expect(groupOf('relay')).toBe('controls')
  })
})

describe('widgetAvailability', () => {
  const availability = (id: WidgetId, caps: ReturnType<typeof withState>) =>
    widgetAvailability(id, caps)

  it('keeps the map and the status circles always available, even on an empty van', () => {
    const caps = withState({})
    expect(availability('map', caps)).toBe('available')
    expect(availability('status', caps)).toBe('available')
  })

  it('an empty van makes every other widget unavailable; before settling they are loading', () => {
    expect(availability('battery', withState({}))).toBe('unavailable')
    expect(availability('group-energy', withState({}))).toBe('unavailable')
    expect(availability('battery', withState({}, false))).toBe('loading')
    expect(availability('map', withState({}, false))).toBe('available')
  })

  it('battery and power flow need a battery; solar needs solar', () => {
    const caps = withState({ solar: rec })
    expect(availability('battery', caps)).toBe('unavailable')
    expect(availability('power-flow', caps)).toBe('unavailable')
    expect(availability('solar', caps)).toBe('available')
    expect(availability('power-flow', withState({ batteries: rec }))).toBe('available')
  })

  it('fresh and grey water both need a tank', () => {
    const caps = withState({ tanks: rec })
    expect(availability('fresh-water', caps)).toBe('available')
    expect(availability('grey-water', caps)).toBe('available')
  })

  it('a group card needs any one member type: Climate on a heater or a temperature sensor', () => {
    expect(availability('group-climate', withState({ heaters: rec }))).toBe('available')
    expect(availability('group-climate', withState({ temperatures: rec }))).toBe('available')
    expect(availability('group-climate', withState({ tilt: rec }))).toBe('unavailable')
    expect(availability('group-van', withState({ tilt: rec }))).toBe('available')
  })

  it('an offline Driver is not absent: its widget stays available', () => {
    const caps = withState({
      drivers: {
        tilt: {
          health: 'offline',
          info: { driver: 'tilt', product: 't', source: 's', version: 'v1', publishes: ['tilt'] },
        },
      },
    })
    expect(availability('tilt', caps)).toBe('available')
  })
})
