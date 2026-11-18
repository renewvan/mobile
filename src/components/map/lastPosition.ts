import AsyncStorage from '@react-native-async-storage/async-storage'

// Where the van last had a GPS fix, kept on the phone so the map opens there while the receiver is
// still looking for one (or the van is out of reach). The dashboard does the same in the kiosk's
// browser storage.

const STORAGE_KEY = 'renewvan.map.last-position.v1'

/** `[latitude, longitude]`, as the bus orders them. */
export type LatLon = readonly [number, number]

/** A stored position, or null for anything that is not two usable coordinates. */
export function parseLastPosition(raw: string | null): LatLon | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (!Array.isArray(value) || value.length !== 2) return null
    const [lat, lon] = value as unknown[]
    if (typeof lat !== 'number' || typeof lon !== 'number') return null
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
    return [lat, lon]
  } catch {
    return null
  }
}

export async function readLastPosition(): Promise<LatLon | null> {
  try {
    return parseLastPosition(await AsyncStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function rememberPosition(position: LatLon): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(position)).catch(() => {})
}
