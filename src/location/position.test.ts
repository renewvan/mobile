import { emptyRenewvanBusState, type Gps, type RenewvanBusState } from '@/types'
import {
  locationPermissionLabel,
  resolvePosition,
  selectVanGps,
  type PhonePosition,
} from './position'

const fixedGps: Gps = {
  driver: 'gps',
  fix_quality: 'gps',
  satellites_in_use: 8,
  latitude: 47.9958,
  longitude: 7.8528,
}

const phone: PhonePosition = { latitude: 48.1, longitude: 7.9, accuracy: 12 }

function stateWith(gps: Gps, health: 'online' | 'offline' = 'online'): RenewvanBusState {
  return {
    ...emptyRenewvanBusState,
    gps: { main: gps },
    drivers: {
      gps: {
        info: { driver: 'gps', product: 'GPS', source: 'test', version: '1', publishes: ['gps'] },
        health,
      },
    },
  }
}

describe('position source', () => {
  it('uses a fixed van GPS before the phone', () => {
    const van = selectVanGps(stateWith(fixedGps))
    expect(resolvePosition(van, phone)).toEqual({
      source: 'van',
      position: { latitude: 47.9958, longitude: 7.8528, accuracy: null },
    })
  })

  it('falls back to the phone when the GPS driver is offline', () => {
    const van = selectVanGps(stateWith(fixedGps, 'offline'))
    expect(van).toBeUndefined()
    expect(resolvePosition(van, phone)).toEqual({ source: 'phone', position: phone })
  })

  it('falls back to the phone when the GPS has no fix', () => {
    const van = selectVanGps(stateWith({ ...fixedGps, fix_quality: 'no_fix' }))
    expect(van).toBeUndefined()
    expect(resolvePosition(van, phone).source).toBe('phone')
  })

  it('accepts a fixed legacy GPS without a driver record', () => {
    const legacy = { ...fixedGps, driver: undefined }
    expect(selectVanGps({ ...emptyRenewvanBusState, gps: { main: legacy } })).toEqual(legacy)
  })

  it('returns none when neither source has a position', () => {
    expect(resolvePosition(undefined, null)).toEqual({ source: 'none', position: null })
  })
})

describe('location permission label', () => {
  it('distinguishes undetermined, denied, blocked and granted', () => {
    expect(locationPermissionLabel(null)).toBe('Checking…')
    expect(locationPermissionLabel({ status: 'undetermined', canAskAgain: true })).toBe(
      'Not requested',
    )
    expect(locationPermissionLabel({ status: 'denied', canAskAgain: true })).toBe('Denied')
    expect(locationPermissionLabel({ status: 'denied', canAskAgain: false })).toBe(
      'Off for this app',
    )
    expect(locationPermissionLabel({ status: 'granted', canAskAgain: false })).toBe('Allowed')
  })
})
