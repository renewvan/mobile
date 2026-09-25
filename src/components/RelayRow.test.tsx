import { render, screen } from '@testing-library/react-native'
import { RelayRow } from './RelayRow'

test('renders the label and an "on" accessibility state when state is true', async () => {
  await render(<RelayRow label="Ceiling lights" state={true} />)
  expect(screen.getByText('Ceiling lights')).toBeTruthy()
  expect(screen.getByLabelText('on')).toBeTruthy()
})

test('renders an "off" accessibility state when state is false', async () => {
  await render(<RelayRow label="Roof fan" state={false} />)
  expect(screen.getByLabelText('off')).toBeTruthy()
})
