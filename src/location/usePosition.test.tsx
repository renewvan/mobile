import { act, renderHook, waitFor } from '@testing-library/react-native'
import * as Location from 'expo-location'
import type { ReactNode } from 'react'
import { AppState } from 'react-native'
import { emptyRenewvanBusState, type Gps, type RenewvanBusState } from '@/types'
import { PositionProvider } from './PositionProvider'
import { usePosition } from './usePosition'

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}))

let mockBusState: RenewvanBusState
jest.mock('@/bus/RenewvanBusProvider', () => ({
  useRenewvanBus: () => ({ state: mockBusState }),
}))

const location = jest.mocked(Location)
const remove = jest.fn()
const fixedGps: Gps = {
  driver: 'gps',
  fix_quality: 'gps',
  satellites_in_use: 8,
  latitude: 47.9958,
  longitude: 7.8528,
}
const withVanFix: RenewvanBusState = {
  ...emptyRenewvanBusState,
  gps: { main: fixedGps },
  drivers: {
    gps: {
      info: { driver: 'gps', product: 'GPS', source: 'test', version: '1', publishes: ['gps'] },
      health: 'online',
    },
  },
}
const wrapper = ({ children }: { children: ReactNode }) => (
  <PositionProvider>{children}</PositionProvider>
)

const setAppState = (value: string) =>
  Object.defineProperty(AppState, 'currentState', { value, configurable: true })

beforeEach(() => {
  jest.clearAllMocks()
  setAppState('active')
  mockBusState = emptyRenewvanBusState
  location.getForegroundPermissionsAsync.mockResolvedValue({
    status: 'granted',
    canAskAgain: true,
  } as Location.LocationPermissionResponse)
  location.watchPositionAsync.mockResolvedValue({ remove })
})

describe('usePosition', () => {
  it('never prompts on mount', async () => {
    location.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'undetermined',
      canAskAgain: true,
    } as Location.LocationPermissionResponse)
    const { result } = await renderHook(() => usePosition(), { wrapper })
    await waitFor(() => expect(result.current.status?.status).toBe('undetermined'))
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
    expect(location.watchPositionAsync).not.toHaveBeenCalled()
  })

  it('does not request permission or watch while the van has a fix', async () => {
    mockBusState = withVanFix
    const { result } = await renderHook(() => usePosition(), { wrapper })
    await waitFor(() => expect(result.current.status?.status).toBe('granted'))
    await act(() => result.current.requestPermission())
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
    expect(location.watchPositionAsync).not.toHaveBeenCalled()
    expect(result.current.source).toBe('van')
  })

  it('shares one watch between callers', async () => {
    await renderHook(() => [usePosition(), usePosition()], { wrapper })
    await waitFor(() => expect(location.watchPositionAsync).toHaveBeenCalledTimes(1))
  })

  it('neither reads permission nor watches in the background', async () => {
    setAppState('background')
    await renderHook(() => usePosition(), { wrapper })
    await act(async () => {})
    expect(location.getForegroundPermissionsAsync).not.toHaveBeenCalled()
    expect(location.watchPositionAsync).not.toHaveBeenCalled()
  })
})
