import { render, screen } from '@testing-library/react-native'
import { ConnectionBanner } from './ConnectionBanner'

test('shows connected copy', async () => {
  await render(<ConnectionBanner status="connected" />)
  expect(screen.getByText('van bus connected')).toBeTruthy()
})

test('shows connecting copy', async () => {
  await render(<ConnectionBanner status="connecting" />)
  expect(screen.getByText('connecting to van bus…')).toBeTruthy()
})

test('shows disconnected copy, distinct from live/last-known state', async () => {
  await render(<ConnectionBanner status="disconnected" />)
  expect(screen.getByText('disconnected — showing last-known state')).toBeTruthy()
})
