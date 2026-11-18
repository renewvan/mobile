import { parseEnvJs, parseHubAddress, resolveBrokerUrl, sessionCookieOf } from './hubAddress'

describe('parseHubAddress', () => {
  it('reads a bare host as the hub over https', () => {
    expect(parseHubAddress(' 192.168.1.50 ')).toEqual({
      ok: true,
      target: { kind: 'hub', origin: 'https://192.168.1.50', display: '192.168.1.50' },
    })
  })

  it('keeps a port and drops a path', () => {
    expect(parseHubAddress('https://van.ts.net:8443/login?next=/')).toEqual({
      ok: true,
      target: { kind: 'hub', origin: 'https://van.ts.net:8443', display: 'van.ts.net:8443' },
    })
  })

  it('reads a ws address as a direct broker connection', () => {
    expect(parseHubAddress('ws://192.168.1.50:9001')).toEqual({
      ok: true,
      target: { kind: 'broker', url: 'ws://192.168.1.50:9001', display: '192.168.1.50:9001' },
    })
    expect(parseHubAddress('wss://van.local/mqtt')).toEqual({
      ok: true,
      target: { kind: 'broker', url: 'wss://van.local/mqtt', display: 'van.local' },
    })
  })

  it('refuses an empty address, spaces, other schemes and embedded credentials', () => {
    expect(parseHubAddress('   ').ok).toBe(false)
    expect(parseHubAddress('my van').ok).toBe(false)
    expect(parseHubAddress('mqtt://192.168.1.50').ok).toBe(false)
    expect(parseHubAddress('ws://user:secret@192.168.1.50:9001').ok).toBe(false)
  })
})

describe('resolveBrokerUrl', () => {
  it('turns a path into this hub’s own WebSocket', () => {
    expect(resolveBrokerUrl('https://van.local', '/mqtt')).toBe('wss://van.local/mqtt')
    expect(resolveBrokerUrl('http://10.0.2.2:8080', '/mqtt')).toBe('ws://10.0.2.2:8080/mqtt')
  })

  it('defaults to /mqtt and keeps a full URL as it is', () => {
    expect(resolveBrokerUrl('https://van.local', undefined)).toBe('wss://van.local/mqtt')
    expect(resolveBrokerUrl('https://van.local', 'ws://10.0.0.5:9001')).toBe('ws://10.0.0.5:9001')
  })
})

describe('parseEnvJs', () => {
  it('reads the three values the dashboard container writes', () => {
    const text = `window.__ENV__ = {
  VITE_MQTT_WS_URL: "/mqtt",
  VITE_MQTT_USERNAME: "command",
  VITE_MQTT_PASSWORD: "p\\"a\\\\ss"
};`
    expect(parseEnvJs(text)).toEqual({ url: '/mqtt', username: 'command', password: 'p"a\\ss' })
  })

  it('reads an empty value as not set', () => {
    const text = 'window.__ENV__ = { VITE_MQTT_WS_URL: "/mqtt", VITE_MQTT_USERNAME: "" };'
    expect(parseEnvJs(text)).toEqual({ url: '/mqtt', username: undefined, password: undefined })
  })

  it('reads anything else as not an env.js', () => {
    expect(parseEnvJs('<!doctype html><title>Sign in</title>')).toBeNull()
  })
})

describe('sessionCookieOf', () => {
  it('picks the session out of a Set-Cookie header, without its attributes', () => {
    expect(
      sessionCookieOf(
        'renewvan_session=1799999999.abc123; Path=/; HttpOnly; Secure; SameSite=Strict',
      ),
    ).toBe('renewvan_session=1799999999.abc123')
  })

  it('finds it among other cookies', () => {
    expect(sessionCookieOf('other=1; Path=/, renewvan_session=xyz; Max-Age=10')).toBe(
      'renewvan_session=xyz',
    )
  })

  it('is undefined with no header, no session, or a cleared one', () => {
    expect(sessionCookieOf(null)).toBeUndefined()
    expect(sessionCookieOf('other=1; Path=/')).toBeUndefined()
    expect(sessionCookieOf('renewvan_session=; Max-Age=0')).toBeUndefined()
  })
})
