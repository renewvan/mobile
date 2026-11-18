import * as Haptics from 'expo-haptics'
import { Minus, Plus, Thermometer } from 'lucide-react-native'
import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native'
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg'
import { useScrollLock } from '@/components/Screen'
import { tabular } from '@/components/ui'
import { alpha, useTheme } from '@/theme'
import { arc, CENTRE, point, START_DEG, SWEEP_DEG, valueAt } from './dialGeometry'

const STROKE = 20
/** The glow's disc: inset 14% from the edge of the 200-unit drawing. */
const GLOW_R = 72
/** The dial's drawn size on screen. */
const SIZE = 264

export interface DialSliderProps {
  label: string
  /** The value the heater reports, or the target of a command in flight; `undefined` reads as unknown. */
  value: number | undefined
  min: number
  max: number
  unit: string
  /** The arc and readout colour. */
  tone: string
  /** Word in the tone colour above the value, e.g. the heater's phase. */
  status?: string
  /** Where the room is now, on the same scale: the arc is dim up to it and bright from it to the value. */
  marker?: number
  /** Text under the value, beside a thermometer: the current reading. */
  reading?: string
  disabled: boolean
  /** A command is in flight: the dial shows its target with a spinner and ignores input. */
  busy: boolean
  /** Called once per gesture, on release (or per button press), never while dragging. */
  onCommit: (to: number) => void
}

/**
 * A thermostat-style circular slider: drag around the arc, or press − or +. A drag only moves the
 * knob locally and sends one command on release, so a gesture never floods the heater with writes
 * (a settings write is only confirmed by its next read, hub ADR 0021). Each step the knob crosses
 * ticks the phone's haptics.
 */
export function DialSlider({
  label,
  value,
  min,
  max,
  unit,
  tone,
  status,
  marker,
  reading,
  disabled,
  busy,
  onCommit,
}: DialSliderProps) {
  const { colors } = useTheme()
  const [drag, setDrag] = useState<number | null>(null)
  const off = disabled || busy || value === undefined
  const shown = drag ?? value
  const along = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min))) * SWEEP_DEG
  const target = shown === undefined ? 0 : along(shown)
  // Dim up to the room's temperature, bright from there to the target; all bright with no marker.
  const dimTo = marker === undefined ? 0 : Math.min(along(marker), target)

  // What the finger is on right now. A ref beside the state: a quick tap presses and releases
  // before React has re-rendered, so the release handler cannot rely on the `drag` it closed over.
  const dragging = useRef<number | null>(null)
  const { lock, unlock } = useScrollLock()
  const move = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent
    const next = valueAt(locationX, locationY, SIZE, min, max)
    if (next !== dragging.current) {
      dragging.current = next
      void Haptics.selectionAsync()
      setDrag(next)
    }
  }
  const release = () => {
    unlock()
    const to = dragging.current
    dragging.current = null
    setDrag(null)
    if (to !== null && to !== value) onCommit(to)
  }
  const cancel = () => {
    unlock()
    dragging.current = null
    setDrag(null)
  }

  const step = (delta: number) => {
    if (off || value === undefined) return
    const held = Math.min(max, Math.max(min, value + delta))
    if (held === value) return
    void Haptics.selectionAsync()
    onCommit(held)
  }

  const [knobX, knobY] = point(START_DEG + target)
  const [markX, markY] = point(START_DEG + (marker === undefined ? 0 : along(marker)))

  return (
    <View style={styles.wrap}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: shown === undefined ? 'Unknown' : `${shown}${unit}` }}
        accessibilityState={{ disabled: off }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) =>
          step(event.nativeEvent.actionName === 'increment' ? 1 : -1)
        }
        style={styles.dial}
        // The dial itself is the touch target (its drawing ignores touches), so a touch's
        // coordinates are the dial's own.
        collapsable={false}
        onStartShouldSetResponder={() => !off}
        onMoveShouldSetResponder={() => !off}
        // The page scrolls; once a finger is on the dial the dial keeps it.
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          lock()
          move(event)
        }}
        onResponderMove={move}
        onResponderRelease={release}
        onResponderTerminate={cancel}
      >
        <View pointerEvents="none" style={styles.drawing}>
          <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200">
            {/* The dashboard's glow behind the readout: the tone at the centre, fading to nothing
                by 70% of a disc inset 14% from the dial's edge. A gradient, not a flat disc. */}
            <Defs>
              <RadialGradient
                id="dial-glow"
                cx={CENTRE}
                cy={CENTRE}
                r={GLOW_R}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset={0} stopColor={tone} stopOpacity={0.16} />
                <Stop offset={0.7} stopColor={tone} stopOpacity={0} />
                <Stop offset={1} stopColor={tone} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={CENTRE} cy={CENTRE} r={GLOW_R} fill="url(#dial-glow)" />
            <Path
              d={arc(START_DEG, SWEEP_DEG)}
              fill="none"
              stroke={colors.border}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
            {shown !== undefined && target > 0 && (
              <Path
                d={arc(START_DEG, target)}
                fill="none"
                stroke={tone}
                strokeWidth={STROKE}
                strokeLinecap="round"
                opacity={off ? 0.6 : 1}
              />
            )}
            {shown !== undefined && dimTo > 0 && (
              <>
                <Path
                  d={arc(START_DEG, dimTo)}
                  fill="none"
                  stroke={colors.background}
                  strokeOpacity={0.45}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                />
                <Circle cx={markX} cy={markY} r={4} fill={colors.background} fillOpacity={0.6} />
              </>
            )}
            {shown !== undefined && (
              <Circle
                cx={knobX}
                cy={knobY}
                r={STROKE / 2 + 1}
                fill="#ffffff"
                stroke={alpha('#000000', 0.25)}
                strokeWidth={1}
              />
            )}
          </Svg>
          <View style={styles.readout}>
            {status !== undefined && <Text style={[styles.status, { color: tone }]}>{status}</Text>}
            <View style={styles.valueRow}>
              <Text style={[styles.value, { color: colors.foreground }]}>
                {shown === undefined ? '—' : shown}
              </Text>
              {unit !== '' && shown !== undefined && (
                <Text style={[styles.unit, { color: colors.foreground }]}>{unit}</Text>
              )}
            </View>
            {reading !== undefined && (
              <View style={styles.reading}>
                <Thermometer size={16} color={tone} />
                <Text style={[styles.readingText, { color: tone }]}>{reading}</Text>
              </View>
            )}
            {busy && <ActivityIndicator size="small" color={tone} />}
          </View>
        </View>
      </View>
      <View style={styles.steps}>
        {(
          [
            {
              delta: -1,
              Icon: Minus,
              name: `Decrease ${label}`,
              atEnd: value !== undefined && value <= min,
            },
            {
              delta: 1,
              Icon: Plus,
              name: `Increase ${label}`,
              atEnd: value !== undefined && value >= max,
            },
          ] as const
        ).map(({ delta, Icon, name, atEnd }) => {
          const blocked = off || atEnd
          return (
            <Pressable
              key={delta}
              accessibilityRole="button"
              accessibilityLabel={name}
              accessibilityState={{ disabled: blocked }}
              disabled={blocked}
              android_ripple={{ color: colors.default, borderless: true, radius: 22 }}
              onPress={() => step(delta)}
              style={[styles.step, { borderColor: colors.border, opacity: blocked ? 0.4 : 1 }]}
            >
              <Icon size={20} color={colors.foreground} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  dial: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  drawing: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  readout: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  status: { fontSize: 16, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  value: { fontSize: 60, lineHeight: 64, fontWeight: '300', ...tabular },
  unit: { fontSize: 20, fontWeight: '300', marginTop: 6 },
  reading: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readingText: { fontSize: 16, fontWeight: '600', ...tabular },
  // The −/+ row sits inside the arc's opening, as part of the circle.
  steps: { flexDirection: 'row', gap: 12, marginTop: -SIZE * 0.2, marginBottom: 12 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
