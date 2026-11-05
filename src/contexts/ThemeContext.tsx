import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'peaceai:theme'

const isPreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemTheme() : preference
}

export function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isPreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

/**
 * Applies the preference to <html>: `data-theme` drives every token, while we
 * also stamp the resolved light/dark value for `color-scheme` and the browser UI.
 */
export function applyTheme(preference: ThemePreference, resolved: ResolvedTheme) {
  const root = document.documentElement
  root.dataset.theme = preference
  root.dataset.resolvedTheme = resolved

  // `color-scheme` is owned by CSS. Inline styles beat the `system` rules, so
  // an inline value would pin the wrong scheme after switching preference.
  root.style.removeProperty('color-scheme')

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = resolved === 'dark' ? '#0e0913' : '#f7f6fa'
}

interface ThemeContextValue {
  /** What the user chose: light, dark, or follow the OS. */
  preference: ThemePreference
  /** What is actually rendered right now. */
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
  /** Flip between light and dark, leaving `system` behind once used. */
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredPreference())
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStoredPreference()))

  // Keep the document in sync with the preference, including OS changes in `system` mode.
  useEffect(() => {
    const next = resolveTheme(preference)
    setResolved(next)
    applyTheme(preference, next)

    if (preference !== 'system' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const updated = resolveTheme('system')
      setResolved(updated)
      applyTheme('system', updated)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [preference])

  // Follow the theme across tabs.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      setPreferenceState(isPreference(event.newValue) ? event.newValue : 'system')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Private mode or blocked storage: the theme still applies for this session.
    }
  }, [])

  const toggle = useCallback(() => {
    setPreferenceState((current) => {
      const next: ThemePreference = resolveTheme(current) === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Ignore persistence failures.
      }
      return next
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider.')
  return context
}
