import { accuracyRadius, metresPerPixelAtZoom0 } from './accuracyRing'

describe('metresPerPixelAtZoom0', () => {
  it('is the documented equator value, shrinking with latitude', () => {
    expect(metresPerPixelAtZoom0(0)).toBeCloseTo(78271.517, 3)
    expect(metresPerPixelAtZoom0(60)).toBeCloseTo(78271.517 / 2, 3)
  })
})

describe('accuracyRadius', () => {
  it('is an exponential interpolation of the zoom, in pixels', () => {
    const m0 = metresPerPixelAtZoom0(48)
    const px = 20 / m0
    expect(accuracyRadius(20, 48)).toEqual([
      'interpolate',
      ['exponential', 2],
      ['zoom'],
      0,
      px,
      20,
      px * 2 ** 20,
    ])
  })
})
