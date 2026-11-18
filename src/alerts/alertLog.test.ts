import { desiredAlerts, isFrozen, parseAlertLog, reconcile, type AlertEntry } from './alertLog'
import type { RenewvanBusState } from '@/types'

const tank = {
  fluid_type: 'fresh_water',
  level_pct: 5,
  capacity_l: 100,
  status: 'ok',
  alarm_state: 'alarm',
  volume_since_full_l: 95,
  volume_since_empty_l: 5,
}
const baseState = (over: Partial<RenewvanBusState> = {}) =>
  ({ tanks: {}, batteries: {}, chargers: {}, ...over }) as RenewvanBusState
const args = (over: Partial<Parameters<typeof desiredAlerts>[0]> = {}) => ({
  state: baseState(),
  status: 'connected' as const,
  tailscale: null,
  demo: false,
  ...over,
})
const live = { connecting: false, settled: true, demo: false }

describe('desiredAlerts', () => {
  it('raises a tank in alarm, the starter battery low, a lost hub and a down Tailscale', () => {
    const desired = desiredAlerts(
      args({
        state: baseState({
          tanks: { t1: tank } as never,
          batteries: { b: { starter_voltage_v: 11, starter_voltage_alarm: 'low' } } as never,
        }),
        status: 'disconnected',
        tailscale: { connected: false } as never,
      }),
    )
    expect(Object.keys(desired).sort()).toEqual([
      'mqtt-connection',
      'starter-battery',
      'tailscale-connection',
      'tank:t1',
    ])
    expect(desired['tank:t1'].title).toBe('Fresh water tank alarm')
  })

  it('raises nothing for a quiet van, and nothing about a Tailscale it has not heard of', () => {
    expect(desiredAlerts(args())).toEqual({})
  })

  it('leaves the simulated van out in Demo mode but keeps the hub link alert', () => {
    const desired = desiredAlerts(
      args({
        state: baseState({ tanks: { t1: tank } as never }),
        status: 'disconnected',
        demo: true,
      }),
    )
    expect(Object.keys(desired)).toEqual(['mqtt-connection'])
  })
})

describe('reconcile', () => {
  const content = { type: 'error', title: 'Fresh water tank alarm', description: 'x' } as const

  it('opens a new alert once, newest first', () => {
    const first = reconcile([], { 'tank:t1': content }, live, 100)
    expect(first.opened.map((e) => e.key)).toEqual(['tank:t1'])
    const again = reconcile(first.entries, { 'tank:t1': content }, live, 200)
    expect(again.entries).toBe(first.entries)
    expect(again.opened).toEqual([])
  })

  it('resolves an alert whose condition cleared and keeps the row', () => {
    const { entries } = reconcile([], { 'tank:t1': content }, live, 100)
    const done = reconcile(entries, {}, live, 200)
    expect(done.entries).toHaveLength(1)
    expect(done.entries[0].resolvedAt).toBe(200)
    expect(done.resolved).toHaveLength(1)
  })

  it('opens a fresh row when a resolved alert comes back', () => {
    const { entries } = reconcile([], { 'tank:t1': content }, live, 100)
    const cleared = reconcile(entries, {}, live, 200).entries
    const back = reconcile(cleared, { 'tank:t1': content }, live, 300)
    expect(back.entries.map((e) => e.resolvedAt)).toEqual([undefined, 200])
  })

  it('does not resolve van alerts before the retained state has settled, but does the hub one', () => {
    const open = reconcile(
      [],
      { 'tank:t1': content, [`mqtt-connection`]: { ...content, type: 'warning' } },
      live,
      100,
    ).entries
    const unsettled = reconcile(open, {}, { ...live, settled: false }, 200)
    expect(unsettled.entries.filter((e) => e.resolvedAt === undefined).map((e) => e.key)).toEqual([
      'tank:t1',
    ])
  })

  it('keeps the real van alerts open while Demo mode shows another', () => {
    const { entries } = reconcile([], { 'tank:t1': content }, live, 100)
    const demo = reconcile(entries, {}, { ...live, demo: true }, 200)
    expect(demo.entries).toBe(entries)
  })

  it('keeps at most 200 rows', () => {
    const many: AlertEntry[] = Array.from({ length: 200 }, (_, i) => ({
      ...content,
      id: `o${i}`,
      key: `tank:${i}`,
      createdAt: i,
      resolvedAt: i,
    }))
    expect(reconcile(many, { 'tank:new': content }, live, 999).entries).toHaveLength(200)
  })
})

describe('isFrozen', () => {
  it('holds the hub connection alert only while a reconnect is under way', () => {
    expect(isFrozen('mqtt-connection', { ...live, settled: false, demo: true })).toBe(false)
    expect(isFrozen('mqtt-connection', { ...live, connecting: true })).toBe(true)
  })
})

describe('parseAlertLog', () => {
  it('reads back a log and drops rows that are not alerts', () => {
    const good = { id: 'a', key: 'k', type: 'warning', title: 't', description: 'd', createdAt: 1 }
    expect(parseAlertLog(JSON.stringify([good, { id: 'b' }, 3, null]))).toEqual([good])
  })

  it('treats nothing, junk or a non-array as an empty log', () => {
    expect(parseAlertLog(null)).toEqual([])
    expect(parseAlertLog('not json')).toEqual([])
    expect(parseAlertLog('{"a":1}')).toEqual([])
  })
})
