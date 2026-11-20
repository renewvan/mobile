import * as Haptics from 'expo-haptics'
import { GripVertical } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { NativeSwitch } from '@/components/native'
import { WIDGET_LABELS, layoutAfterDrop, widgetSlots } from '@/preferences/preferences'
import type { WidgetId } from '@/lib/widgets'
import { radius, useTheme } from '@/theme'

// Home's widgets as one list: the shown ones in order, a divider, then the hidden ones.
// Holding a row's grip lifts it; dropping it above the divider shows it, below hides it, and the
// switch does the same without dragging. Every slot is the same height, so where a row would land
// is arithmetic on the finger's distance, and the rows in between slide one step out of the way.

const ROW = 60
const GAP = 8
const PITCH = ROW + GAP

interface Drag {
  /** The slot being dragged, -1 when none. */
  from: SharedValue<number>
  /** The slot it would land in. */
  to: SharedValue<number>
  /** How far the finger has moved down since the grip was lifted, kept inside the list. */
  dy: SharedValue<number>
}

function Slot({ index, drag, children }: { index: number; drag: Drag; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const { from, to, dy } = drag
    if (from.value === index) {
      return { transform: [{ translateY: dy.value }], zIndex: 10, elevation: 6 }
    }
    let shift = 0
    if (from.value >= 0) {
      if (from.value < index && index <= to.value) shift = -1
      else if (from.value > index && index >= to.value) shift = 1
    }
    return { transform: [{ translateY: withTiming(shift * PITCH, { duration: 120 }) }], zIndex: 0 }
  })
  return (
    <Animated.View style={[styles.slot, { top: index * PITCH }, style]}>{children}</Animated.View>
  )
}

export function WidgetList({
  layout,
  widgets,
  onChange,
}: {
  layout: readonly WidgetId[]
  /** The catalogue to offer; unavailable widgets stay out of the editor and in the saved layout. */
  widgets: readonly WidgetId[]
  onChange: (layout: readonly WidgetId[]) => void
}) {
  const { colors } = useTheme()
  const slots = widgetSlots(layout, widgets)
  const from = useSharedValue(-1)
  const to = useSharedValue(-1)
  const dy = useSharedValue(0)
  const drag: Drag = { from, to, dy }

  const reset = () => {
    from.value = -1
    to.value = -1
    dy.value = 0
  }
  // Rows keep their dragged-to position until the new order has been laid out, then settle: the
  // same commit moves every `top`, so resetting any earlier would flash the old order.
  // Keyed by content: the parent filters the layout into a new array on every bus message, and
  // resetting on identity would cancel a drag in progress.
  const layoutKey = layout.join(',')
  useLayoutEffect(reset, [layoutKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const drop = (index: number, target: number) => {
    const next = layoutAfterDrop(layout, index, target, widgets)
    if (next === layout) reset()
    else onChange(next)
  }
  const last = slots.length - 1

  return (
    <View style={{ height: slots.length * PITCH - GAP }}>
      {slots.map((id, index) => {
        if (id === 'divider') {
          return (
            <Slot key="divider" index={index} drag={drag}>
              <View style={styles.divider}>
                <View style={[styles.line, { backgroundColor: colors.separator }]} />
                <Text style={[styles.dividerText, { color: colors.muted }]}>
                  Hidden. Drag a widget below to hide it
                </Text>
              </View>
            </Slot>
          )
        }
        const shown = index < layout.length
        const pan = Gesture.Pan()
          .activateAfterLongPress(150)
          .onStart(() => {
            from.value = index
            to.value = index
            dy.value = 0
            scheduleOnRN(Haptics.selectionAsync)
          })
          .onUpdate((event) => {
            const moved = Math.min(
              Math.max(event.translationY, -index * PITCH),
              (last - index) * PITCH,
            )
            dy.value = moved
            to.value = Math.min(Math.max(Math.round((index * PITCH + moved) / PITCH), 0), last)
          })
          .onFinalize(() => {
            // Only a grip that was lifted (`onStart` ran) has anything to drop.
            if (from.value === index) scheduleOnRN(drop, index, to.value)
          })
        const label = WIDGET_LABELS[id]
        // Without dragging: the screen reader moves a shown widget a place at a time.
        const step = (delta: number) => onChange(layoutAfterDrop(layout, index, index + delta))
        return (
          <Slot key={id} index={index} drag={drag}>
            <View
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.separator },
              ]}
            >
              <GestureDetector gesture={pan}>
                <View
                  accessible
                  accessibilityLabel={`Reorder ${label}`}
                  accessibilityActions={
                    shown
                      ? [
                          ...(index > 0 ? [{ name: 'up', label: 'Move up' }] : []),
                          ...(index < layout.length - 1
                            ? [{ name: 'down', label: 'Move down' }]
                            : []),
                        ]
                      : []
                  }
                  onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'up' ? -1 : 1)}
                  style={styles.grip}
                >
                  <GripVertical size={20} color={colors.muted} />
                </View>
              </GestureDetector>
              <View style={styles.text}>
                <Text numberOfLines={1} style={[styles.label, { color: colors.foreground }]}>
                  {label}
                </Text>
                <Text numberOfLines={1} style={[styles.detail, { color: colors.muted }]}>
                  {shown ? `Position ${index + 1} of ${layout.length}` : 'Hidden'}
                </Text>
              </View>
              <View style={styles.switch}>
                <NativeSwitch
                  label={label}
                  value={shown}
                  onChange={(on) => onChange(on ? [...layout, id] : layout.filter((w) => w !== id))}
                />
              </View>
            </View>
          </Slot>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', left: 0, right: 0, height: ROW },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
  },
  grip: { width: 48, height: ROW, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '500' },
  detail: { fontSize: 13 },
  switch: { paddingRight: 14 },
  divider: { flex: 1, justifyContent: 'center', gap: 6 },
  line: { height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12, fontWeight: '500', letterSpacing: 0.6, textTransform: 'uppercase' },
})
