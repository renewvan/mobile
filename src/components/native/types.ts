// Props of the app's form controls (`index.tsx`, drawn by HeroUI Native).

export interface NativeSwitchProps {
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  /** Read by screen readers; the switch itself shows no text. */
  label: string
}

export interface SegmentedProps<T extends string> {
  options: readonly { key: T; label: string }[]
  /** `undefined` selects nothing: an unknown state. */
  selected: T | undefined
  onSelect: (key: T) => void
  disabled?: boolean
  label: string
}

export interface NativeButtonProps {
  label: string
  onPress: () => void
  disabled?: boolean
  variant?: 'filled' | 'danger' | 'outlined' | 'text'
}

export interface NativeTextFieldProps {
  label: string
  /** The field owns its text; this is only what it starts with. */
  defaultValue?: string
  onChangeText: (text: string) => void
  secure?: boolean
  /** Shown under the field, which is then drawn as invalid. */
  error?: string | null
  keyboard?: 'text' | 'uri' | 'password'
  autoFocus?: boolean
  onSubmit?: () => void
}

export interface NativeSliderProps {
  label: string
  value: number
  min: number
  max: number
  disabled?: boolean
  /** Called while the thumb moves, for a readout that follows the finger. */
  onChange?: (value: number) => void
  /** Called once, when the thumb is let go: the moment to send a command. */
  onCommit: (value: number) => void
}
