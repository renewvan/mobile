import { relayLabel } from './relayLabels'

test('returns the mapped label for a known id', () => {
  expect(relayLabel('lights_ceiling')).toBe('Ceiling lights')
})

test('falls back to the raw id for an unknown id', () => {
  expect(relayLabel('some_new_channel')).toBe('some_new_channel')
})
