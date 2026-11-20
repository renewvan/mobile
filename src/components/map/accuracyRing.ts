import type { CircleLayerStyle } from '@maplibre/maplibre-react-native'

/** Metres per screen pixel at zoom 0 and a latitude (MapLibre's documented 78271.517 at the equator). */
export function metresPerPixelAtZoom0(latitude: number): number {
  return 78271.517 * Math.cos((latitude * Math.PI) / 180)
}

/**
 * A circle's `circleRadius` that stays `accuracy` metres at any zoom. MapLibre allows `['zoom']`
 * only as the input of a top-level interpolate, so the radius is doubled per zoom level between two stops.
 */
export function accuracyRadius(
  accuracy: number,
  latitude: number,
): Exclude<CircleLayerStyle['circleRadius'], number | undefined> {
  const px = accuracy / metresPerPixelAtZoom0(latitude)
  return ['interpolate', ['exponential', 2], ['zoom'], 0, px, 20, px * 2 ** 20]
}
