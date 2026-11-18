// The heater dial's geometry, apart from its drawing so it can be tested without a renderer.

/** The arc opens at the bottom: it starts at 135° (bottom left) and sweeps 270° clockwise. */
export const START_DEG = 135
export const SWEEP_DEG = 270
export const CENTRE = 100
export const RADIUS = 80

/** The point on the arc at `deg`, in the dial's 200-unit drawing box. */
export function point(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CENTRE + RADIUS * Math.cos(rad), CENTRE + RADIUS * Math.sin(rad)]
}

/** The track's thickness, in the dial's 200-unit drawing box. */
export const STROKE = 20

/**
 * The track runs this many degrees past each end of the value range, so the knob at min or max
 * still sits inside it and the ends can take the app's corner radius instead of a round cap.
 */
export const PAD_DEG = ((STROKE / 2 / RADIUS) * 180) / Math.PI

function polar(deg: number, r: number): string {
  const rad = (deg * Math.PI) / 180
  return `${+(CENTRE + r * Math.cos(rad)).toFixed(3)} ${+(CENTRE + r * Math.sin(rad)).toFixed(3)}`
}

/**
 * A band of the track from `fromDeg` sweeping `sweepDeg` clockwise, as a filled shape whose chosen
 * ends get `cornerR` (in drawing units) like the dashboard's dial; an end left square keeps its cut.
 */
export function band(
  fromDeg: number,
  sweepDeg: number,
  roundStart: boolean,
  roundEnd: boolean,
  cornerR: number,
): string {
  const ro = RADIUS + STROKE / 2
  const ri = RADIUS - STROKE / 2
  const high = fromDeg + sweepDeg
  // Rounding a corner moves its arc end by cornerR along the arc, which is cornerR / r radians.
  const along = (r: number) => ((cornerR / r) * 180) / Math.PI
  const large = sweepDeg > 180 ? 1 : 0
  const oLow = fromDeg + (roundStart ? along(ro) : 0)
  const oHigh = high - (roundEnd ? along(ro) : 0)
  const iLow = fromDeg + (roundStart ? along(ri) : 0)
  const iHigh = high - (roundEnd ? along(ri) : 0)

  let d = `M ${polar(oLow, ro)} A ${ro} ${ro} 0 ${large} 1 ${polar(oHigh, ro)}`
  if (roundEnd) {
    d += ` A ${cornerR} ${cornerR} 0 0 1 ${polar(high, ro - cornerR)} L ${polar(high, ri + cornerR)}`
    d += ` A ${cornerR} ${cornerR} 0 0 1 ${polar(iHigh, ri)}`
  } else {
    d += ` L ${polar(iHigh, ri)}`
  }
  d += ` A ${ri} ${ri} 0 ${large} 0 ${polar(iLow, ri)}`
  if (roundStart) {
    d += ` A ${cornerR} ${cornerR} 0 0 1 ${polar(fromDeg, ri + cornerR)} L ${polar(fromDeg, ro - cornerR)}`
    d += ` A ${cornerR} ${cornerR} 0 0 1 ${polar(oLow, ro)}`
  } else {
    d += ` L ${polar(oLow, ro)}`
  }
  return `${d} Z`
}

/** The value under a touch at (`x`, `y`) inside the dial's square of side `size`. */
export function valueAt(x: number, y: number, size: number, min: number, max: number): number {
  const deg = (Math.atan2(y - size / 2, x - size / 2) * 180) / Math.PI
  let a = (((deg - START_DEG) % 360) + 360) % 360
  // The gap at the bottom belongs to whichever end is nearer.
  if (a > SWEEP_DEG) a = a - SWEEP_DEG > (360 - SWEEP_DEG) / 2 ? 0 : SWEEP_DEG
  return min + Math.round((a / SWEEP_DEG) * (max - min))
}
