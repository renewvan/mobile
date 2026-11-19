import { useUniwind } from 'uniwind'

// The dashboard's theme tokens (dashboard `src/global.css`), converted from oklch to sRGB hex:
// React Native has no CSS custom properties or oklch. Same names, so a component ported from the
// dashboard reads the same token it read there.
export interface Palette {
  accent: string
  accentForeground: string
  background: string
  border: string
  danger: string
  dangerForeground: string
  default: string
  foreground: string
  muted: string
  separator: string
  success: string
  successForeground: string
  surface: string
  surfaceSecondary: string
  surfaceTertiary: string
  warning: string
  warningForeground: string
}

const light: Palette = {
  accent: '#0485f7',
  accentForeground: '#fcfcfc',
  background: '#f1f6fc',
  border: '#dadee5',
  danger: '#ff343a',
  dangerForeground: '#fcfcfc',
  default: '#e7ecf2',
  foreground: '#15191d',
  muted: '#6a737e',
  separator: '#e0e5eb',
  success: '#05ca62',
  successForeground: '#161917',
  surface: '#fdffff',
  surfaceSecondary: '#ecf0f5',
  surfaceTertiary: '#e7ebf0',
  warning: '#f6a41b',
  warningForeground: '#1a1815',
}

const dark: Palette = {
  accent: '#0485f7',
  accentForeground: '#fcfcfc',
  background: '#040609',
  border: '#26292e',
  danger: '#dd383c',
  dangerForeground: '#fcfcfc',
  default: '#24282c',
  foreground: '#f8fdff',
  muted: '#98a1ac',
  separator: '#1e2226',
  success: '#05ca62',
  successForeground: '#161917',
  surface: '#121921',
  surfaceSecondary: '#1e242a',
  surfaceTertiary: '#22272e',
  warning: '#f8b74d',
  warningForeground: '#1a1815',
}

export const palettes = { light, dark }

export interface Theme {
  colors: Palette
  isDark: boolean
  scheme: 'light' | 'dark'
}

/**
 * The palette for the app's light/dark theme: the one Uniwind styles HeroUI with, so hand-drawn
 * parts and the controls always change over together (`applyTheme` in `src/preferences`).
 */
export function useTheme(): Theme {
  const isDark = useUniwind().theme === 'dark'
  return { colors: isDark ? dark : light, isDark, scheme: isDark ? 'dark' : 'light' }
}

/** `#rrggbb` at an opacity, for the soft washes the dashboard builds with `color-mix`. */
export function alpha(hex: string, opacity: number): string {
  const value = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
  return `${hex}${value.toString(16).padStart(2, '0')}`
}

/**
 * The corner radii: HeroUI's scale from the dashboard's one token, `--radius` (0.25rem, 4px), as
 * `src/global.css` gives it to HeroUI Native. A part we draw takes the radius of the HeroUI
 * component it resembles (the dashboard's `docs/design-principles.md`, "Corner radii"): 12 for
 * buttons, toggles, steppers and cards (`3xl`), 8 for chips, badges (the DEMO badge too) and
 * Settings rows (`2xl`), 6 for notes, banners and map overlays (`xl`), 4 for level bars and fields
 * (`lg`). A circle only for what is round by nature. Never a number or a pill.
 */
export const radius = { sm: 2, md: 3, lg: 4, xl: 6, '2xl': 8, '3xl': 12, field: 4 } as const

/** The page gutter and card radius every screen shares. */
export const layout = { gutter: 16, gap: 12, radius: radius['3xl'] } as const
