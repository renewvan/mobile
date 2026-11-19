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
 * The corner radii, the dashboard's rule (its `docs/design-principles.md`, "Corner radii"): two
 * sizes from its base `--radius` (0.25rem, 4px), and the circle.
 * - `control` (4px): anything pressed or read at a glance: buttons, toggles, tabs, switches,
 *   sliders, inputs, chips, badges, level bars, notes, map overlays.
 * - `container` (8px): anything that holds other things: cards, Settings rows and boxes, dialogs.
 * - A circle (half the size) only for what is round by nature: status dots, swatches, dial markers.
 * `src/global.css` maps HeroUI Native's components onto the same two as `--radius-control` and
 * `--radius-container`. Use these, never a number.
 */
export const radius = { control: 4, container: 8 } as const

/** The page gutter and card radius every screen shares. */
export const layout = { gutter: 16, gap: 12, radius: radius.container } as const
