import { render, screen } from '@testing-library/react-native'
import { RadialGauge } from './RadialGauge'

test('renders rounded percentage, label, and sub text', async () => {
  await render(<RadialGauge pct={63.7} label="Fresh water" sub="fresh · 45/70 L" />)
  expect(screen.getByText('64%')).toBeTruthy()
  expect(screen.getByText('Fresh water')).toBeTruthy()
  expect(screen.getByText('fresh · 45/70 L')).toBeTruthy()
})

test('clamps out-of-range percentages for display', async () => {
  await render(<RadialGauge pct={140} label="Over" />)
  expect(screen.getByText('100%')).toBeTruthy()
})

test('clamps negative percentages to zero', async () => {
  await render(<RadialGauge pct={-10} label="Under" />)
  expect(screen.getByText('0%')).toBeTruthy()
})

test('omits sub text when not provided', async () => {
  await render(<RadialGauge pct={50} label="No sub" />)
  expect(screen.queryByText(/·/)).toBeNull()
})
