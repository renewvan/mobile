// How the app reaches a van, from the one address the owner types on the sign-in screen.
//
// - A hub address (`van.local`, `192.168.1.50`, `https://renewvan.tail1234.ts.net`): the dashboard
//   site behind Caddy. The app signs in like the dashboard's login page does (hub ADR 0029), reads
//   the broker account from `/env.js` and connects to the `/mqtt` WebSocket on the same origin.
//   This is the path that also works over Tailscale.
// - A broker address (`ws://192.168.1.50:9001`): Mosquitto's own WebSocket listener, with a broker
//   account the owner types (hub ADR 0026). Van LAN and development only.

export type HubTarget =
  | { kind: 'hub'; origin: string; display: string }
  | { kind: 'broker'; url: string; display: string }

export type ParsedAddress = { ok: true; target: HubTarget } | { ok: false; error: string }

const SCHEME = /^([a-z][a-z0-9+.-]*):\/\//i

/** Reads what the owner typed. A bare host means the hub over HTTPS, as the browser reaches it. */
export function parseHubAddress(input: string): ParsedAddress {
  const text = input.trim()
  if (text === '') return { ok: false, error: 'Enter the address of your van.' }
  if (/\s/.test(text)) return { ok: false, error: 'An address cannot contain spaces.' }
  const scheme = SCHEME.exec(text)?.[1].toLowerCase()
  if (scheme !== undefined && !['http', 'https', 'ws', 'wss'].includes(scheme)) {
    return { ok: false, error: 'Use an https:// or ws:// address.' }
  }
  let url: URL
  try {
    url = new URL(scheme === undefined ? `https://${text}` : text)
  } catch {
    return { ok: false, error: 'That does not look like an address.' }
  }
  if (url.hostname === '') return { ok: false, error: 'That does not look like an address.' }
  // A broker URL may embed `user:pass@`; the account is asked for in its own fields instead.
  if (url.username !== '' || url.password !== '') {
    return { ok: false, error: 'Leave the user and password out of the address.' }
  }
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    const path = url.pathname === '/' ? '' : url.pathname
    return {
      ok: true,
      target: { kind: 'broker', url: `${url.protocol}//${url.host}${path}`, display: url.host },
    }
  }
  return {
    ok: true,
    target: { kind: 'hub', origin: `${url.protocol}//${url.host}`, display: url.host },
  }
}

/**
 * The broker WebSocket for a hub: `/env.js` names it as a path (`/mqtt`, "this site's own origin")
 * or as a full URL. Same rule as the dashboard's `resolveBrokerUrl`.
 */
export function resolveBrokerUrl(origin: string, value: string | undefined): string {
  const path = value === undefined || value === '' ? '/mqtt' : value
  if (!path.startsWith('/')) return path
  return `${origin.replace(/^http/, 'ws')}${path}`
}

/** The hub's session cookie (hub `docker/login/login.py`). */
const SESSION_COOKIE = 'renewvan_session'

/**
 * The session cookie as a `Cookie` header value (`renewvan_session=<value>`), from a sign-in
 * response's `Set-Cookie`. The app's own requests never need it (the platform's cookie store sends
 * it), but the map's native HTTP client does not share that store. Undefined when the header is
 * not there or carries no session.
 */
export function sessionCookieOf(setCookie: string | null): string | undefined {
  if (!setCookie) return undefined
  const match = new RegExp(`(?:^|[,;\\s])${SESSION_COOKIE}=([^;,\\s]+)`).exec(setCookie)
  return match && match[1] !== '' ? `${SESSION_COOKIE}=${match[1]}` : undefined
}

export interface BrokerEnv {
  url: string | undefined
  username: string | undefined
  password: string | undefined
}

/**
 * Reads the dashboard's runtime `/env.js` (`window.__ENV__ = { VITE_MQTT_WS_URL: "...", ... }`,
 * written by dashboard `docker/generate-env-js.sh`). It is a script, not JSON, so the three values
 * are picked out by key; each is a JSON-escaped string. Null when none of them is there, which
 * means the answer was not an env.js at all (a login page, a proxy error).
 */
export function parseEnvJs(text: string): BrokerEnv | null {
  const read = (key: string): string | undefined => {
    const match = new RegExp(`${key}\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")`).exec(text)
    if (!match) return undefined
    try {
      const value: unknown = JSON.parse(match[1])
      return typeof value === 'string' && value !== '' ? value : undefined
    } catch {
      return undefined
    }
  }
  if (!/VITE_MQTT_(WS_URL|USERNAME|PASSWORD)\s*:/.test(text)) return null
  return {
    url: read('VITE_MQTT_WS_URL'),
    username: read('VITE_MQTT_USERNAME'),
    password: read('VITE_MQTT_PASSWORD'),
  }
}
