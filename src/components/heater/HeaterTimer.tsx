import { ChevronDown, Minus, Plus } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { tabular } from '@/components/ui'
import { radius, useTheme } from '@/theme'

// The dashboard's heater timer (Autoterm's On in / Off in), drawn the same. The hub and Driver have
// no timer field, so on a real heater, which is all this app talks to, the dashboard shows it read
// 00:00 and disabled; so does this. Make these take a timer the day the hub has one.

const FIELDS = ['Off in', '0 Hours', '0 Min.'] as const
const FIELD_FLEX = [1.1, 1.2, 1]

/** A big − on the left and + on the right with the title and the armed time between them. */
export function TimerHeader() {
  const { colors } = useTheme()
  const step = (Icon: typeof Minus, name: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ disabled: true }}
      disabled
      style={[styles.step, { borderColor: colors.border }]}
    >
      <Icon size={28} color={colors.foreground} />
    </Pressable>
  )
  return (
    <View style={styles.header}>
      {step(Minus, 'Subtract 30 minutes')}
      <View style={styles.title}>
        <Text style={[styles.titleText, { color: colors.foreground }]}>Timer</Text>
        <Text style={[styles.time, { color: colors.muted }]}>00:00</Text>
      </View>
      {step(Plus, 'Add 30 minutes')}
    </View>
  )
}

/** The timer as one row of three pick-only fields: On in / Off in, Hours, Minutes. */
export function TimerPicker() {
  const { colors } = useTheme()
  return (
    <View accessibilityLabel="Timer" style={styles.row}>
      {FIELDS.map((text, i) => (
        <View
          key={text}
          accessible
          accessibilityLabel={['Timer type', 'Hours', 'Minutes'][i]}
          accessibilityValue={{ text }}
          accessibilityState={{ disabled: true }}
          style={[styles.field, { flex: FIELD_FLEX[i], backgroundColor: colors.default }]}
        >
          <Text numberOfLines={1} style={[styles.fieldText, { color: colors.foreground }]}>
            {text}
          </Text>
          <ChevronDown size={16} color={colors.muted} style={styles.chevron} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: {
    width: 48,
    height: 48,
    borderRadius: radius['3xl'],
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
  title: { alignItems: 'center' },
  titleText: { fontSize: 14, fontWeight: '600' },
  time: { fontSize: 12, ...tabular },
  row: { flexDirection: 'row', gap: 8 },
  field: {
    minWidth: 0,
    height: 44,
    borderRadius: radius.xl,
    justifyContent: 'center',
    paddingHorizontal: 28,
    opacity: 0.5,
  },
  fieldText: { fontSize: 14, textAlign: 'center' },
  chevron: { position: 'absolute', right: 8 },
})
