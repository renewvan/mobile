import { render, screen } from '@testing-library/react-native'
import { fixtureTanks } from '../test/fixtures'
import { TanksTab } from './TanksTab'

test('renders a gauge per tank, ordered fresh then grey', async () => {
  await render(<TanksTab tanks={fixtureTanks} />)
  const gauges = screen.getAllByTestId('radial-gauge')
  expect(gauges).toHaveLength(2)
  expect(screen.getByText('Fresh water')).toBeTruthy()
  expect(screen.getByText('Grey water')).toBeTruthy()
})

test('shows liters-remaining readout for an ok tank', async () => {
  await render(<TanksTab tanks={fixtureTanks} />)
  expect(screen.getByText('fresh · 45/70 L')).toBeTruthy()
})

test('shows sensor-fault status instead of liters when status is not ok', async () => {
  await render(<TanksTab tanks={fixtureTanks} />)
  expect(screen.getByText('grey · Sensor fault: open circuit')).toBeTruthy()
})

test('shows an empty state with no tanks', async () => {
  await render(<TanksTab tanks={{}} />)
  expect(screen.getByText('No tank data yet.')).toBeTruthy()
})

test('skips a still-partial tank record instead of rendering garbage', async () => {
  // MQTT builds an entity up one property per retained message; a
  // `health`-topic collision or a mid-flight connection can leave an id
  // with only some fields set.
  await render(
    <TanksTab
      tanks={{
        ...fixtureTanks,
        health: { status: 'ok' } as unknown as (typeof fixtureTanks)['fresh'],
      }}
    />,
  )
  expect(screen.getAllByTestId('radial-gauge')).toHaveLength(2)
})
