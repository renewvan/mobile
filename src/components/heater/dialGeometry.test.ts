import { valueAt } from './dialGeometry'

// The dial is a 270° arc that opens at the bottom: it starts bottom-left (135°) and ends
// bottom-right. `valueAt` turns a touch inside the dial's square into a value on that arc.
describe('valueAt', () => {
  const SIZE = 200
  const at = (x: number, y: number) => valueAt(x, y, SIZE, 1, 30)

  it('reads the top of the dial as the middle of the range', () => {
    expect(at(100, 0)).toBe(16) // 1 + round(0.5 * 29)
  })

  it('reads the two ends of the arc as the minimum and maximum', () => {
    expect(at(30, 170)).toBe(1) // bottom-left, where the arc starts
    expect(at(170, 170)).toBe(30) // bottom-right, where it ends
  })

  it('grows clockwise from left to right', () => {
    expect(at(0, 100)).toBeLessThan(at(100, 0))
    expect(at(100, 0)).toBeLessThan(at(200, 100))
  })

  it('gives the gap at the bottom to whichever end is nearer', () => {
    expect(at(95, 200)).toBe(1)
    expect(at(105, 200)).toBe(30)
  })

  it('works on a power-level range too', () => {
    expect(valueAt(100, 0, SIZE, 1, 9)).toBe(5)
  })
})
