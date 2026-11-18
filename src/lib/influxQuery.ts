/** The bucket the hub's logger writes to (hub/docker-compose.yml). */
const BUCKET = 'renewvan'

/** A Flux string literal: backslashes and double quotes escaped so a value cannot end the string. */
function fluxString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Flux for a solar controller's yield counter: the `max` of `yield_today_wh` per hour, stamped at the
 * hour's start. The counter climbs through the day and resets at the controller's midnight, so the
 * best hour of a local day is the day's harvest; the hours are grouped into days at the counter's
 * resets, which needs no time zone from anyone (see `yieldHistoryFromPoints`). Days are not cut
 * here because Flux's `timezone` package costs InfluxDB seconds per query. Reaches back one day
 * more than asked, because the oldest day is usually partial.
 */
export function dailyYieldQuery({ id, days }: { id: string; days: number }): string {
  return [
    `from(bucket: ${fluxString(BUCKET)})`,
    `  |> range(start: -${days + 1}d)`,
    `  |> filter(fn: (r) => r._measurement == "solar" and r.id == ${fluxString(id)} and r._field == "yield_today_wh")`,
    '  |> aggregateWindow(every: 1h, fn: max, createEmpty: false, timeSrc: "_start")',
  ].join('\n')
}
