import { parseEnvJs, resolveBrokerUrl, sessionCookieOf, type HubTarget } from './hubAddress'

// The app's side of the hub's login service (hub `docker/login/login.py`, ADR 0029). The session is
// a cookie; React Native keeps it in the platform's cookie store and sends it on later requests to
// the same host, including the `/mqtt` WebSocket upgrade, so nothing here ever holds it.

/** What the bus connection needs: where the broker is and the account to use. */
export interface BrokerConfig {
  url: string
  username?: string
  password?: string
}

export type SignInResult =
  | {
      ok: true
      /** The session as a `Cookie` header value, for the map's own HTTP client. */ cookie?: string
    }
  | { ok: false; error: string }
export type BrokerConfigResult =
  | { ok: true; config: BrokerConfig }
  | { ok: false; reason: 'signed-out' | 'unreachable' | 'not-a-hub' }

const UNREACHABLE = 'Could not reach the van. Check the address and the connection.'
const TIMEOUT_MS = 10_000

async function request(url: string, init: RequestInit = {}): Promise<Response> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, credentials: 'include', signal: abort.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Why a sign-in failed, from the login service's own answer when it gives one. */
async function failureMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json()
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      return body.error
    }
  } catch {
    // not JSON: fall through to the generic message
  }
  return res.status === 429
    ? 'Too many attempts. Wait a minute and try again.'
    : 'Could not sign in. Try again.'
}

export async function signIn(
  origin: string,
  user: string,
  password: string,
): Promise<SignInResult> {
  try {
    const res = await request(`${origin}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password }),
    })
    return res.ok
      ? { ok: true, cookie: sessionCookieOf(res.headers.get('set-cookie')) }
      : { ok: false, error: await failureMessage(res) }
  } catch {
    return { ok: false, error: UNREACHABLE }
  }
}

/** Clears the session cookie. A hub that cannot be reached is not an error: the app forgets it anyway. */
export async function signOut(origin: string): Promise<void> {
  try {
    await request(`${origin}/api/logout`, { method: 'POST' })
  } catch {
    // nothing to do
  }
}

/**
 * The broker connection for a signed-in hub, from its `/env.js`. Only an explicit 401 means signed
 * out; a network failure is reported apart, so a van that is out of reach never throws the owner
 * back to the sign-in screen.
 */
export async function fetchBrokerConfig(origin: string): Promise<BrokerConfigResult> {
  let res: Response
  try {
    res = await request(`${origin}/env.js`, { cache: 'no-store' })
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
  if (res.status === 401) return { ok: false, reason: 'signed-out' }
  if (!res.ok) return { ok: false, reason: 'unreachable' }
  const env = parseEnvJs(await res.text())
  if (env === null) return { ok: false, reason: 'not-a-hub' }
  return {
    ok: true,
    config: {
      url: resolveBrokerUrl(origin, env.url),
      username: env.username,
      password: env.password,
    },
  }
}

/** The broker connection for a target the owner typed a broker account for. */
export function directBrokerConfig(
  target: Extract<HubTarget, { kind: 'broker' }>,
  username: string,
  password: string,
): BrokerConfig {
  return {
    url: target.url,
    username: username === '' ? undefined : username,
    password: password === '' ? undefined : password,
  }
}
