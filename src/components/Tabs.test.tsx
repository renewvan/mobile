import { fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Tabs } from './Tabs'

const tabs = [
  { id: 'tanks', label: 'Tanks', content: <Text>Tanks panel</Text> },
  { id: 'power', label: 'Power', content: <Text>Power panel</Text> },
  { id: 'switches', label: 'Switches', content: <Text>Switches panel</Text> },
]

test('renders the active tab panel content', async () => {
  await render(<Tabs tabs={tabs} activeId="power" onSelect={() => {}} />)
  expect(screen.getByText('Power panel')).toBeTruthy()
  expect(screen.queryByText('Tanks panel')).toBeNull()
})

test('calls onSelect with the pressed tab id', async () => {
  const onSelect = jest.fn()
  await render(<Tabs tabs={tabs} activeId="tanks" onSelect={onSelect} />)
  fireEvent.press(screen.getByText('Switches'))
  expect(onSelect).toHaveBeenCalledWith('switches')
})

test('falls back to the first tab when activeId matches nothing', async () => {
  await render(<Tabs tabs={tabs} activeId="nonexistent" onSelect={() => {}} />)
  expect(screen.getByText('Tanks panel')).toBeTruthy()
})
