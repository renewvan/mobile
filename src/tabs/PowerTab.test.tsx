import { render, screen } from '@testing-library/react-native'
import { fixtureBatteries } from '../test/fixtures'
import { PowerTab } from './PowerTab'

test('renders a gauge and readout per battery', async () => {
  await render(<PowerTab batteries={fixtureBatteries} />)
  expect(screen.getByText('Battery (house)')).toBeTruthy()
  expect(screen.getByText('13.1 V · -4.6 A · -60 W · 22°C')).toBeTruthy()
})

test('shows the charge_state badge', async () => {
  await render(<PowerTab batteries={fixtureBatteries} />)
  expect(screen.getByText('absorption')).toBeTruthy()
})

test('signs positive current with a leading +', async () => {
  await render(
    <PowerTab
      batteries={{
        house: {
          soc_pct: 90,
          voltage_v: 13.5,
          current_a: 5.2,
          power_w: 70,
          temperature_c: 20,
          charge_state: 'bulk',
        },
      }}
    />,
  )
  expect(screen.getByText('13.5 V · +5.2 A · 70 W · 20°C')).toBeTruthy()
})

test('shows an empty state with no batteries', async () => {
  await render(<PowerTab batteries={{}} />)
  expect(screen.getByText('No battery data yet.')).toBeTruthy()
})

test('skips a still-partial battery record instead of crashing', async () => {
  // MQTT builds an entity up one property per retained message; a
  // `health`-topic collision or a mid-flight connection can leave an id
  // with only some fields set. Rendering must not throw on the missing
  // ones (e.g. `undefined.toFixed`).
  await render(
    <PowerTab
      batteries={{
        ...fixtureBatteries,
        health: { soc_pct: 0 } as unknown as (typeof fixtureBatteries)['house'],
      }}
    />,
  )
  expect(screen.getByText('Battery (house)')).toBeTruthy()
  expect(screen.queryByText('Battery (health)')).toBeNull()
})
