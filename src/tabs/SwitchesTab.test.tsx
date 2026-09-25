import { render, screen } from '@testing-library/react-native'
import { fixtureRelays } from '../test/fixtures'
import { SwitchesTab } from './SwitchesTab'

test('renders a row per relay with its mapped label', async () => {
  await render(<SwitchesTab relays={fixtureRelays} />)
  expect(screen.getByText('Ceiling lights')).toBeTruthy()
  expect(screen.getByText('Water pump')).toBeTruthy()
  expect(screen.getAllByTestId('relay-row')).toHaveLength(2)
})

test('falls back to the raw id for an unmapped relay', async () => {
  await render(<SwitchesTab relays={{ unmapped_channel: { state: true } }} />)
  expect(screen.getByText('unmapped_channel')).toBeTruthy()
})

test('shows an empty state with no relays', async () => {
  await render(<SwitchesTab relays={{}} />)
  expect(screen.getByText('No relay data yet.')).toBeTruthy()
})
