import type { FluxPoint } from '@/lib/influxCsv'
import { isCompleteSolar, type Solar } from '@/types'

/** The id of the first controller that has its required fields (MQTT builds a record up one property at a time). */
export function firstSolarId(solar: Record<string, Partial<Solar>>): string | undefined {
  return Object.entries(solar).find(([, record]) => isCompleteSolar(record))?.[0]
}

/** The first controller that has its required fields. */
export function firstSolar(solar: Record<string, Partial<Solar>>): Solar | undefined {
  return Object.values(solar).find(isCompleteSolar)
}

export function formatYield(wh: number | undefined): string {
  return wh === undefined ? '—' : (wh / 1000).toFixed(1)
}

/** A day's harvest in the unit that reads best: whole Wh below 1 kWh, otherwise kWh to a decimal. */
export function formatYieldAmount(wh: number): { value: string; unit: 'Wh' | 'kWh' } {
  return wh < 1000
    ? { value: String(Math.round(wh)), unit: 'Wh' }
    : { value: (wh / 1000).toFixed(1), unit: 'kWh' }
}

/** Days of harvest the Power page's Solar tile charts: today and the nine before it. */
export const HISTORY_DAYS = 10

/**
 * Floor for the history chart's scale, in Wh, so a week of overcast days (tens of Wh) cannot
 * stretch to fill the chart and read as a good week.
 */
export const MIN_HISTORY_REFERENCE_WH = 100

/** One day in the history chart. */
export interface YieldDay {
  /** Days before today: 0 is today. */
  daysAgo: number
  /** Harvest in watt-hours, or `null` when the controller has no data for the day. */
  wh: number | null
  /** Bar height as a 0..1 share of the chart's scale; 0 for a gap or a day that harvested nothing. */
  share: number
}

/** What the Solar tile's history chart draws. */
export interface YieldHistoryView {
  /** Oldest first, so today is the last (rightmost) entry. Never padded past what the controller logged. */
  days: YieldDay[]
  /** Watt-hours that fill a full-height bar: the window's best day, never below the floor. */
  referenceWh: number
}

/**
 * The last `count` days of the controller's own log, oldest first. The log is newest first with
 * index 0 as today, and as short as the controller's own history, so a new controller yields
 * fewer than `count` days rather than invented empty ones. `null` stays a gap and is not `0`.
 * Returns `undefined` when the controller publishes no history, so the chart is not drawn.
 */
export function yieldHistoryView(
  history: readonly (number | null)[] | undefined,
  count = HISTORY_DAYS,
): YieldHistoryView | undefined {
  if (!history || history.length === 0) return undefined
  const window = history.slice(0, count)
  const referenceWh = Math.max(MIN_HISTORY_REFERENCE_WH, ...window.map((wh) => wh ?? 0))
  const days = window
    .map((wh, daysAgo) => ({
      daysAgo,
      wh,
      share: wh === null ? 0 : Math.min(1, wh / referenceWh),
    }))
    .reverse()
  return { days, referenceWh }
}

/** Intervals the history chart's scale lines divide the axis into. */
const AXIS_INTERVALS = 4

/**
 * The history chart's scale in kWh: the axis top (the smallest of 0.5, 1, 2, 4, 8... that holds the
 * window's best day) and the lines up to it, 0 first, evenly spaced so each reads as a round number.
 */
export function yieldAxis(referenceWh: number): { maxKwh: number; ticks: number[] } {
  let maxKwh = 0.5
  while (maxKwh * 1000 < referenceWh) maxKwh *= 2
  return {
    maxKwh,
    ticks: Array.from({ length: AXIS_INTERVALS + 1 }, (_, i) => (maxKwh * i) / AXIS_INTERVALS),
  }
}

/** Days of the controller's log the Solar history page lists: a month, the most a controller keeps. */
export const HISTORY_PAGE_DAYS = 30

/**
 * A history day for a list: `Today`, `Yesterday`, then the date (`Mon 27 Oct`) counted back from
 * `now`. The controller's own day boundary is not on the bus, so this counts calendar days.
 */
export function historyDayLabel(daysAgo: number, now: Date): string {
  if (daysAgo === 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo)
  return day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * The newest segment (the controller's current day) only reads as "today" while it is young
 * enough: its first hour-max lands within an hour of the controller's midnight, so beyond a day
 * plus that hour the controller has fallen silent and today stays a gap.
 */
const DAY_START_MAX_AGE_MS = 26 * 3_600_000

/**
 * InfluxDB's hourly maxima of the controller's `yield_today_wh`, as the same newest-first list the
 * controller's own log uses (index 0 is today), so the charts take either. The counter climbs
 * through a day and resets at the controller's midnight, so every drop between consecutive hour
 * maxima is that midnight — whatever time zone the controller lives in. The hours are segmented at
 * the drops and each segment's maximum is that day's harvest: no time zone from anyone, so a kiosk
 * in another zone than its controller still charts whole days. A day that harvested nothing is
 * `null`, not `0`; the list stops at the oldest day with data rather than padding, and `undefined`
 * means no day has any.
 */
export function yieldHistoryFromPoints(
  points: readonly FluxPoint[],
  count: number,
  now: Date,
): (number | null)[] | undefined {
  const hours = points
    .filter((point): point is FluxPoint & { value: number } => point.value !== null)
    .slice()
    .sort((a, b) => a.time.getTime() - b.time.getTime())
  if (hours.length === 0) return undefined

  // The controller's days, oldest first: a climb ends where the next hour's max is lower.
  const segments: { wh: number; startedAt: number }[] = []
  let dayMax = 0
  let dayStartedAt = hours[0].time.getTime()
  let previous = Number.NEGATIVE_INFINITY
  for (const { time, value } of hours) {
    if (value < previous) {
      segments.push({ wh: dayMax, startedAt: dayStartedAt })
      dayMax = 0
      dayStartedAt = time.getTime()
    }
    dayMax = Math.max(dayMax, value)
    previous = value
  }
  segments.push({ wh: dayMax, startedAt: dayStartedAt })

  const days: (number | null)[] = Array.from({ length: count }, () => null)
  const todayIsIn = now.getTime() - segments[segments.length - 1].startedAt <= DAY_START_MAX_AGE_MS
  const firstDay = todayIsIn ? 0 : 1
  for (let i = 0; i < segments.length && firstDay + i < count; i++) {
    days[firstDay + i] = segments[segments.length - 1 - i].wh
  }
  const oldest = days.findLastIndex((wh) => wh !== null)
  return oldest === -1 ? undefined : days.slice(0, oldest + 1)
}
