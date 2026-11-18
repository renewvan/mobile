import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Uniwind } from 'uniwind'
import { DEFAULT_PREFERENCES, parsePreferences, type Preferences } from './preferences'

// The app's own settings, kept on the phone. Nothing here is secret (the session is in the secure
// store, `src/session`), so it is plain app storage.

const STORAGE_KEY = 'renewvan.preferences.v1'

export interface PreferencesContextValue extends Preferences {
  /** Changes some preferences and stores the result. */
  update: (changes: Partial<Preferences>) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

/**
 * Light or dark for the whole app, or the phone's own. Uniwind switches its styles (HeroUI's
 * controls) and `useTheme`'s palette at once, in the same render; it then sets the platform's
 * appearance too, for the native tab bar and the status bar, which follow a moment later. Waiting
 * on the platform alone made every screen change over only after Android's round trip.
 */
function applyTheme(theme: Preferences['theme']) {
  Uniwind.setTheme(theme)
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return
        const stored = parsePreferences(raw)
        applyTheme(stored.theme)
        setPreferences(stored)
      })
      // Storage that cannot be read: the defaults stand for this run.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const update = useCallback((changes: Partial<Preferences>) => {
    if (changes.theme !== undefined) applyTheme(changes.theme)
    setPreferences((current) => {
      const next = { ...current, ...changes }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const value = useMemo(() => ({ ...preferences, update }), [preferences, update])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext)
  if (value === null) throw new Error('usePreferences needs a PreferencesProvider above it')
  return value
}
