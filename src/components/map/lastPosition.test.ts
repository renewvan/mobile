import { parseLastPosition } from './lastPosition'

// The native storage module is not there under Jest; only the parsing is exercised here.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

describe('parseLastPosition', () => {
  it('reads a stored [latitude, longitude]', () => {
    expect(parseLastPosition('[47.9955,7.8529]')).toEqual([47.9955, 7.8529])
  })

  it('is null for nothing stored or anything that is not two coordinates', () => {
    expect(parseLastPosition(null)).toBeNull()
    expect(parseLastPosition('not json')).toBeNull()
    expect(parseLastPosition('[47.9]')).toBeNull()
    expect(parseLastPosition('["47.9","7.8"]')).toBeNull()
    expect(parseLastPosition('{"lat":47.9,"lon":7.8}')).toBeNull()
  })

  it('is null for coordinates that are not on the Earth', () => {
    expect(parseLastPosition('[91,0]')).toBeNull()
    expect(parseLastPosition('[0,-181]')).toBeNull()
  })
})
