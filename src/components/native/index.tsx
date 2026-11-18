import * as Haptics from 'expo-haptics'
import { Button, FieldError, Input, Label, Slider, Switch, Tabs, TextField } from 'heroui-native'
import { useState } from 'react'
import type {
  NativeButtonProps,
  NativeSliderProps,
  NativeSwitchProps,
  NativeTextFieldProps,
  SegmentedProps,
} from './types'

// The app's form controls, drawn by HeroUI Native on every platform: the same library, shapes and
// theme tokens as the dashboard (HeroUI web), themed by `src/global.css`. Screens import these
// wrappers rather than HeroUI directly, so a control keeps one meaning across the app: it shows
// the van's retained state and never flips ahead of it.

const BUTTON_VARIANT = {
  filled: 'primary',
  danger: 'danger',
  outlined: 'outline',
  text: 'ghost',
} as const

export function NativeButton({ label, onPress, disabled, variant = 'filled' }: NativeButtonProps) {
  return (
    <Button
      variant={BUTTON_VARIANT[variant]}
      size="lg"
      isDisabled={disabled}
      onPress={onPress}
      accessibilityLabel={label}
    >
      {label}
    </Button>
  )
}

export function NativeTextField({
  label,
  defaultValue = '',
  onChangeText,
  secure,
  error,
  keyboard,
  autoFocus,
  onSubmit,
}: NativeTextFieldProps) {
  const [value, setValue] = useState(defaultValue)
  return (
    <TextField isInvalid={Boolean(error)}>
      <Label>{label}</Label>
      <Input
        accessibilityLabel={label}
        value={value}
        onChangeText={(text) => {
          setValue(text)
          onChangeText(text)
        }}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        keyboardType={keyboard === 'uri' ? 'url' : 'default'}
        onSubmitEditing={onSubmit}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </TextField>
  )
}

export function NativeSwitch({ value, onChange, disabled, label }: NativeSwitchProps) {
  return (
    <Switch
      // Controlled: the thumb follows `value`, not the tap. A switch that commands the van only
      // moves once the van says it has.
      isSelected={value}
      onSelectedChange={(next) => {
        void Haptics.selectionAsync()
        onChange(next)
      }}
      isDisabled={disabled}
      accessibilityLabel={label}
      hitSlop={10}
    />
  )
}

/** A choice of one, as the dashboard's toggle groups: HeroUI tabs with nothing under them. */
export function Segmented<T extends string>({
  options,
  selected,
  onSelect,
  disabled,
  label,
}: SegmentedProps<T>) {
  return (
    <Tabs
      // `''` matches no option: an unknown state selects nothing.
      value={selected ?? ''}
      onValueChange={(key) => {
        const option = options.find((o) => o.key === key)
        if (option && option.key !== selected) onSelect(option.key)
      }}
      accessibilityLabel={label}
    >
      <Tabs.List className="w-full">
        <Tabs.Indicator />
        {options.map((option) => (
          <Tabs.Trigger
            key={option.key}
            value={option.key}
            isDisabled={disabled}
            className="min-h-11 flex-1"
          >
            <Tabs.Label numberOfLines={1}>{option.label}</Tabs.Label>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs>
  )
}

/**
 * HeroUI's slider. While a finger is on it the thumb follows the finger (`onChange`); the value is
 * committed once, on release (`onCommit`), and the thumb then goes back to following the van.
 */
export function NativeSlider({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
  onCommit,
}: NativeSliderProps) {
  const [held, setHeld] = useState<number | null>(null)
  const first = (v: number | number[]) => (Array.isArray(v) ? v[0] : v)
  return (
    <Slider
      value={held ?? Math.min(max, Math.max(min, value))}
      minValue={min}
      maxValue={max}
      isDisabled={disabled}
      aria-label={label}
      onChange={(next) => {
        const n = first(next)
        setHeld(n)
        onChange?.(n)
      }}
      onChangeEnd={(next) => {
        const n = first(next)
        setHeld(null)
        if (n !== value) onCommit(n)
      }}
      className="py-2"
    >
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  )
}
