import { parseFluxCsv, type FluxPoint } from './influxCsv'

/**
 * Runs a Flux query through the hub's `/influx` proxy (hub ADR 0024), behind the same login as the
 * bus: the session cookie rides in the platform's cookie store, and the proxy holds the read-only
 * token, so none is sent from here.
 */
export async function queryInflux(
  origin: string,
  flux: string,
  signal?: AbortSignal,
): Promise<FluxPoint[]> {
  const response = await fetch(`${origin}/influx/api/v2/query?org=renewvan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/vnd.flux', Accept: 'application/csv' },
    body: flux,
    credentials: 'include',
    signal,
  })
  if (!response.ok) throw new Error(`InfluxDB query failed (${response.status})`)
  // Without the proxy a login page answers 200: not an empty history.
  if (!response.headers.get('Content-Type')?.includes('csv')) {
    throw new Error('/influx did not answer with InfluxDB CSV')
  }
  return parseFluxCsv(await response.text())
}
