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

/** An arc path from `fromDeg`, `sweepDeg` clockwise. */
export function arc(fromDeg: number, sweepDeg: number): string {
  const [x1, y1] = point(fromDeg)
  const [x2, y2] = point(fromDeg + sweepDeg)
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

/** The value under a touch at (`x`, `y`) inside the dial's square of side `size`. */
export function valueAt(x: number, y: number, size: number, min: number, max: number): number {
  const deg = (Math.atan2(y - size / 2, x - size / 2) * 180) / Math.PI
  let a = (((deg - START_DEG) % 360) + 360) % 360
  // The gap at the bottom belongs to whichever end is nearer.
  if (a > SWEEP_DEG) a = a - SWEEP_DEG > (360 - SWEEP_DEG) / 2 ? 0 : SWEEP_DEG
  return min + Math.round((a / SWEEP_DEG) * (max - min))
}
