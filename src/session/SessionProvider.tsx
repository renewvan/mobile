import * as SecureStore from 'expo-secure-store'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { setMapSession } from '@/components/map/mapSession'
import { parseHubAddress, type HubTarget } from './hubAddress'
import {
  directBrokerConfig,
  fetchBrokerConfig,
  signIn as hubSignIn,
  signOut as hubSignOut,
  type BrokerConfig,
} from './hubClient'

// Which van this phone is connected to, and the broker connection that follows from it. Kept in
// the Android Keystore-backed secure store: the address and user to prefill, and the broker
// connection, so the app reconnects on its own while the hub is out of reach. The hub login
// password is never stored; the session cookie it buys lasts 30 days (hub ADR 0029).

const STORE_KEY = 'renewvan.session.v1'

/** The hub's origin for a hub sign-in; a direct broker connection has no hub to read a map from. */
function originOf(target: HubTarget): string | null {
  return target.kind === 'hub' ? target.origin : null
}
export const DEFAULT_USER = 'renewvan'

interface Stored {
  /** The hub session as a `Cookie` header value: the map's HTTP client needs it spelled out. */
  cookie?: string
  address: string
  user: string
  target: HubTarget
  config: BrokerConfig
}

export interface Connection {
  /** The hub session as a `Cookie` header value, when the sign-in handed one over. */
  cookie?: string
  target: HubTarget
  config: BrokerConfig
}

export interface SignInInput {
  address: string
  user: string
  password: string
}

export interface Session {
  /** `loading` until the stored van has been read; then signed in (`ready`) or not. */
  status: 'loading' | 'signed-out' | 'ready'
  connection: Connection | null
  /** What the sign-in form starts with: the last van and user. */
  lastAddress: string
  lastUser: string
  /** Why the app is on the sign-in screen again, when it was signed in before. */
  notice: string | null
  signIn: (input: SignInInput) => Promise<string | null>
  signOut: () => Promise<void>
}

const SessionContext = createContext<Session | null>(null)

async function readStored(): Promise<Stored | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<Stored>
    if (!value.address || !value.target || !value.config?.url) return null
    return value as Stored
  } catch {
    return null
  }
}

async function writeStored(value: Stored | null): Promise<void> {
  try {
    if (value === null) await SecureStore.deleteItemAsync(STORE_KEY)
    else await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(value))
  } catch {
    // A phone with no usable keystore still works for this run; it just asks again next time.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Session['status']>('loading')
  const [connection, setConnection] = useState<Connection | null>(null)
  const [last, setLast] = useState({ address: '', user: DEFAULT_USER })
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = await readStored()
      if (cancelled) return
      if (stored === null) {
        setStatus('signed-out')
        return
      }
      setLast({ address: stored.address, user: stored.user || DEFAULT_USER })
      // Connect at once with what worked last time; the session check must not delay the screens.
      setMapSession(originOf(stored.target), stored.cookie)
      setConnection({ target: stored.target, config: stored.config, cookie: stored.cookie })
      setStatus('ready')
      if (stored.target.kind !== 'hub') return
      const fresh = await fetchBrokerConfig(stored.target.origin)
      if (cancelled) return
      if (fresh.ok) {
        // The hub's broker account may have been rotated since.
        const changed = JSON.stringify(fresh.config) !== JSON.stringify(stored.config)
        if (changed) {
          setConnection({ target: stored.target, config: fresh.config, cookie: stored.cookie })
          void writeStored({ ...stored, config: fresh.config })
        }
      } else if (fresh.reason === 'signed-out') {
        setMapSession(null, undefined)
        setConnection(null)
        setNotice('Your session ended. Sign in again.')
        setStatus('signed-out')
      }
      // Unreachable: keep trying with the stored connection; the bus shows it is disconnected.
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async ({ address, user, password }: SignInInput) => {
    const parsed = parseHubAddress(address)
    if (!parsed.ok) return parsed.error
    const { target } = parsed
    let config: BrokerConfig
    let cookie: string | undefined
    if (target.kind === 'broker') {
      // The form prefills the hub's login user; with no password it is not a broker account, and a
      // broker refuses a client that sends a user it does not know.
      const brokerUser = password === '' && user.trim() === DEFAULT_USER ? '' : user.trim()
      config = directBrokerConfig(target, brokerUser, password)
    } else {
      const signedIn = await hubSignIn(target.origin, user.trim(), password)
      if (!signedIn.ok) return signedIn.error
      cookie = signedIn.cookie
      const fetched = await fetchBrokerConfig(target.origin)
      if (!fetched.ok) {
        return fetched.reason === 'not-a-hub'
          ? 'That address answered, but not as a renewvan hub.'
          : 'Signed in, but the van did not hand over its connection. Try again.'
      }
      config = fetched.config
    }
    const stored: Stored = { address: address.trim(), user: user.trim(), target, config, cookie }
    await writeStored(stored)
    setLast({ address: stored.address, user: stored.user || DEFAULT_USER })
    setNotice(null)
    setMapSession(originOf(target), cookie)
    setConnection({ target, config, cookie })
    setStatus('ready')
    return null
  }, [])

  const signOut = useCallback(async () => {
    const target = connection?.target
    setMapSession(null, undefined)
    setConnection(null)
    setStatus('signed-out')
    setNotice(null)
    await writeStored(null)
    if (target?.kind === 'hub') await hubSignOut(target.origin)
  }, [connection])

  const value = useMemo<Session>(
    () => ({
      status,
      connection,
      lastAddress: last.address,
      lastUser: last.user,
      notice,
      signIn,
      signOut,
    }),
    [status, connection, last, notice, signIn, signOut],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): Session {
  const session = useContext(SessionContext)
  if (session === null) throw new Error('useSession needs a SessionProvider above it')
  return session
}
