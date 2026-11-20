import { Stack } from 'expo-router'
import { useHeaderHeight } from 'expo-router/react-navigation'
import { StatusBar } from 'expo-status-bar'
import { Check, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { NativeButton, NativeSwitch, NativeTextField, Segmented } from '@/components/native'
import { Banner, tabular } from '@/components/ui'
import { entityIconOf } from '@/lib/entityIcons'
import { alpha, layout, radius, useTheme, type Palette } from '@/theme'

// What every Settings screen is built from: the dashboard's Settings vocabulary (group, row, detail
// list, choice) drawn for a phone. The screen frame uses the platform's own app bar and back.

/** A Settings screen: the native app bar with its title and back arrow, then a scrolling column. */
export function SettingsScreen({
  title,
  children,
  scroll = true,
  banner = true,
}: {
  title: string
  children: ReactNode
  /**
   * False for a screen that is one full-bleed view of its own (the map): no column, no padding,
   * and the app bar and status bar laid transparently over it, as the dashboard's Map page does.
   */
  scroll?: boolean
  /** False where the screen changes nothing on the van, so "changes will not be sent" would be wrong (the alert list). */
  banner?: boolean
}) {
  const { colors } = useTheme()
  const { status } = useRenewvanBus()
  if (!scroll) return <OverlayScreen title={title}>{children}</OverlayScreen>
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.screen, { paddingBottom: layout.gutter + 30 }]}
      >
        {banner && status === 'disconnected' ? (
          <Banner tone="danger">Not connected to the van. Changes will not be sent.</Banner>
        ) : null}
        {children}
      </ScrollView>
    </View>
  )
}

/**
 * A full-bleed screen under a see-through app bar and status bar: the view runs to the top edge,
 * and a dark fade behind the bar keeps its white title and back arrow readable on any map (the
 * dashboard's `from-black/50 to-transparent` header over its Map page).
 */
function OverlayScreen({ title, children }: { title: string; children: ReactNode }) {
  const headerHeight = useHeaderHeight()
  return (
    <View style={styles.overlayScreen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          title,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: '#ffffff',
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {/* Only while this screen is up; the root's theme-following style comes back on leaving. */}
      <StatusBar style="light" />
      <HeaderHeightContext.Provider value={headerHeight}>{children}</HeaderHeightContext.Provider>
      <Svg
        pointerEvents="none"
        style={[styles.scrim, { height: headerHeight + 24 }]}
        width="100%"
        height={headerHeight + 24}
      >
        <Defs>
          <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
      </Svg>
    </View>
  )
}

const HeaderHeightContext = createContext(0)

/** How far down a full-bleed screen's transparent app bar reaches (0 outside one). */
export function useOverlayTop(): number {
  return useContext(HeaderHeightContext)
}

/** A titled run of rows, with an optional note under it. */
export function Group({
  title,
  note,
  children,
}: {
  title?: string
  note?: string
  children: ReactNode
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.group}>
      {title ? (
        <Text accessibilityRole="header" style={[styles.groupTitle, { color: colors.muted }]}>
          {title}
        </Text>
      ) : null}
      {children}
      {note ? <Note>{note}</Note> : null}
    </View>
  )
}

/** A line of muted explanation between rows. */
export function Note({ children, tone }: { children: ReactNode; tone?: 'danger' }) {
  const { colors } = useTheme()
  return (
    <Text
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={[styles.note, { color: tone === 'danger' ? colors.danger : colors.muted }]}
    >
      {children}
    </Text>
  )
}

/** The rounded surface a row or a set of rows sits on. */
export function Box({ children, padded = false }: { children: ReactNode; padded?: boolean }) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: colors.surface, borderColor: colors.separator },
        padded && styles.boxPadded,
      ]}
    >
      {children}
    </View>
  )
}

export type StatusTone = 'ok' | 'offline' | 'unknown'

export function toneColor(colors: Palette, tone: StatusTone): string {
  return tone === 'ok' ? colors.success : tone === 'unknown' ? colors.warning : colors.muted
}

function Dot({ tone }: { tone: StatusTone }) {
  const { colors } = useTheme()
  return <View style={[styles.dot, { backgroundColor: toneColor(colors, tone) }]} />
}

/** A row that opens another screen: optional icon and status dot, label, description, chevron. */
export function NavRow({
  icon,
  label,
  description,
  tone,
  dim,
  attention,
  onPress,
}: {
  icon?: ReactNode
  label: string
  description?: string
  /** A status dot before the description: a Driver's health. */
  tone?: StatusTone
  /** Greyed: an offline Driver. */
  dim?: boolean
  /** A notification dot at the right: something behind this row needs a look (an open alert, a lost link). */
  attention?: boolean
  onPress: () => void
}) {
  const { colors } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, description, attention && 'needs attention']
        .filter(Boolean)
        .join(', ')}
      android_ripple={{ color: colors.default }}
      onPress={onPress}
      style={[
        styles.box,
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.separator, opacity: dim ? 0.6 : 1 },
      ]}
    >
      {icon}
      <View style={styles.rowText}>
        <Text numberOfLines={1} style={[styles.rowLabel, { color: colors.foreground }]}>
          {label}
        </Text>
        {description ? (
          <View style={styles.rowDescription}>
            {tone ? <Dot tone={tone} /> : null}
            <Text numberOfLines={2} style={[styles.rowDetail, { color: colors.muted }]}>
              {description}
            </Text>
          </View>
        ) : null}
      </View>
      {attention ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  )
}

/** A row whose whole job is one switch. */
export function SwitchRow({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  const { colors } = useTheme()
  return (
    <View style={[styles.row, styles.inner]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {description ? (
          <Text style={[styles.rowDetail, { color: colors.muted }]}>{description}</Text>
        ) : null}
      </View>
      <NativeSwitch label={label} value={value} disabled={disabled} onChange={onChange} />
    </View>
  )
}

/** A label above a segmented choice. */
export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string
  options: readonly { key: T; label: string }[]
  value: T | undefined
  disabled?: boolean
  onChange: (value: T) => void
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.choice}>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      <Segmented
        label={label}
        options={options}
        selected={value}
        disabled={disabled}
        onSelect={(next) => {
          // A re-tap of the selected segment changes nothing.
          if (next !== value) onChange(next)
        }}
      />
    </View>
  )
}

/** One choice out of a list that may be long: a row each, the chosen one ticked. */
export function RadioList<T extends string>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string
  options: readonly { value: T; label: string; description?: string; disabled?: boolean }[]
  value: T | undefined
  disabled?: boolean
  onChange: (value: T) => void
}) {
  const { colors } = useTheme()
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.separator }]}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        const off = disabled || option.disabled
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: off }}
            disabled={off}
            android_ripple={{ color: colors.default }}
            onPress={() => {
              if (!selected) onChange(option.value)
            }}
            style={[
              styles.row,
              styles.inner,
              index > 0 && {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: colors.separator,
              },
              { opacity: off ? 0.5 : 1 },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>{option.label}</Text>
              {option.description ? (
                <Text style={[styles.rowDetail, { color: colors.muted }]}>
                  {option.description}
                </Text>
              ) : null}
            </View>
            {selected ? <Check size={20} color={colors.accent} /> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

/** A list item that can be moved up and down, and optionally opened. */
export function MoveRow({
  icon,
  label,
  description,
  onOpen,
  onUp,
  onDown,
}: {
  icon?: ReactNode
  label: string
  description?: string
  onOpen?: () => void
  /** Absent at the top of the list, or where the list cannot be reordered. */
  onUp?: () => void
  onDown?: () => void
}) {
  const { colors } = useTheme()
  const arrow = (direction: 'up' | 'down', onPress: (() => void) | undefined) => {
    const Icon = direction === 'up' ? ChevronUp : ChevronDown
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Move ${label} ${direction}`}
        accessibilityState={{ disabled: onPress === undefined }}
        disabled={onPress === undefined}
        android_ripple={{ color: colors.default }}
        onPress={onPress}
        style={[styles.arrow, { opacity: onPress === undefined ? 0.3 : 1 }]}
      >
        <Icon size={20} color={colors.foreground} />
      </Pressable>
    )
  }
  const reorderable = onUp !== undefined || onDown !== undefined
  return (
    <View
      style={[
        styles.box,
        styles.moveRow,
        { backgroundColor: colors.surface, borderColor: colors.separator },
      ]}
    >
      <Pressable
        accessibilityRole={onOpen ? 'button' : undefined}
        disabled={onOpen === undefined}
        android_ripple={{ color: colors.default }}
        onPress={onOpen}
        style={[styles.row, styles.moveMain]}
      >
        {icon}
        <View style={styles.rowText}>
          <Text numberOfLines={1} style={[styles.rowLabel, { color: colors.foreground }]}>
            {label}
          </Text>
          {description ? (
            <Text numberOfLines={1} style={[styles.rowDetail, { color: colors.muted }]}>
              {description}
            </Text>
          ) : null}
        </View>
        {onOpen ? <ChevronRight size={18} color={colors.muted} /> : null}
      </Pressable>
      {reorderable ? (
        <View style={[styles.arrows, { borderColor: colors.separator }]}>
          {arrow('up', onUp)}
          {arrow('down', onDown)}
        </View>
      ) : null}
    </View>
  )
}

/** Label and value pairs on one surface. */
export function DetailList({ heading, children }: { heading?: string; children: ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={styles.group}>
      {heading ? (
        <Text accessibilityRole="header" style={[styles.groupTitle, { color: colors.muted }]}>
          {heading}
        </Text>
      ) : null}
      <View
        style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.separator }]}
      >
        {children}
      </View>
    </View>
  )
}

/** One reading. A value nobody reported shows a dash, never a made-up zero. */
export function DetailRow({
  label,
  value,
  tone,
  onPress,
}: {
  label: string
  value: string | null
  /** A status dot before the value. */
  tone?: StatusTone
  /** Makes the row a link to where the value comes from. */
  onPress?: () => void
}) {
  const { colors } = useTheme()
  const content = (
    <>
      <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
      <View style={styles.detailValue}>
        {tone ? <Dot tone={tone} /> : null}
        <Text selectable style={[styles.detailText, { color: colors.foreground }]}>
          {value ?? '—'}
        </Text>
        {onPress ? <ChevronRight size={16} color={colors.muted} /> : null}
      </View>
    </>
  )
  const style = [styles.detail, { borderColor: colors.separator }]
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: colors.default }}
      onPress={onPress}
      style={style}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  )
}

/** Big figures in two columns: an instance's live readings. */
export function StatGrid({
  stats,
}: {
  stats: [label: string, value: string | null, unit: string][]
}) {
  const { colors } = useTheme()
  return (
    <Box padded>
      <View style={styles.stats}>
        {stats.map(([label, value, unit]) => (
          <View key={label} style={styles.stat}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
            <Text numberOfLines={1} style={[styles.statValue, { color: colors.foreground }]}>
              {value ?? '—'}
              {value !== null && unit !== '' ? (
                <Text style={[styles.statUnit, { color: colors.muted }]}> {unit}</Text>
              ) : null}
            </Text>
          </View>
        ))}
      </View>
    </Box>
  )
}

/** Bytes of `text` in UTF-8: the hub's name limits are in bytes, not characters. */
export function utf8Length(text: string): number {
  let bytes = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4
  }
  return bytes
}

/**
 * A name that is saved on purpose: the field, then Save once the text differs and fits. A name is
 * a command to a Driver or the hub, so it is never sent on every keystroke.
 */
export function NameField({
  label = 'Name',
  name,
  maxBytes,
  disabled,
  problem,
  onCommit,
}: {
  label?: string
  /** The current name; `undefined` for an entity that has none yet. */
  name: string | undefined
  maxBytes?: number
  disabled?: boolean
  /** Why the last name was refused, from the caller's own rules. */
  problem?: string
  onCommit: (name: string) => void
}) {
  const [draft, setDraft] = useState(name ?? '')
  const next = draft.trim()
  const tooLong = maxBytes !== undefined && utf8Length(next) > maxBytes
  const changed = next !== '' && next !== (name ?? '')
  return (
    <View style={styles.nameField}>
      <NativeTextField
        // The field owns its text: when the name changes on the bus, start again from it.
        key={name ?? ''}
        label={label}
        defaultValue={name ?? ''}
        error={tooLong ? `At most ${maxBytes} bytes.` : (problem ?? null)}
        onChangeText={setDraft}
        onSubmit={() => {
          if (changed && !tooLong && !disabled) onCommit(next)
        }}
      />
      <NativeButton
        label="Save"
        disabled={disabled || !changed || tooLong}
        onPress={() => onCommit(next)}
      />
    </View>
  )
}

/** A grid of the icons an entity may wear; the chosen one is filled. */
export function IconPicker({
  names,
  value,
  disabled,
  onChange,
}: {
  names: readonly string[]
  value: string | undefined
  disabled?: boolean
  onChange: (name: string) => void
}) {
  const { colors } = useTheme()
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Icon"
      style={[styles.icons, { opacity: disabled ? 0.5 : 1 }]}
    >
      {names.map((name) => {
        const Icon = entityIconOf(name)
        const selected = name === value
        return (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityLabel={name}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            android_ripple={{ color: alpha(colors.accent, 0.2) }}
            onPress={() => {
              if (!selected) onChange(name)
            }}
            style={[
              styles.icon,
              { borderColor: selected ? colors.accent : colors.border },
              selected && { backgroundColor: colors.accent },
            ]}
          >
            <Icon size={22} color={selected ? colors.accentForeground : colors.foreground} />
          </Pressable>
        )
      })}
    </View>
  )
}

/** "Nothing here yet", on a row's surface. */
export function Empty({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Box padded>
      <Text style={{ color: colors.muted, fontSize: 14 }}>{children}</Text>
    </Box>
  )
}

const styles = StyleSheet.create({
  overlayScreen: { flex: 1, backgroundColor: '#262830' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  screen: { padding: layout.gutter, gap: 16, flexGrow: 1 },
  group: { gap: 8 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  note: { fontSize: 13, lineHeight: 18, marginHorizontal: 4 },
  box: {
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  boxPadded: { padding: 14, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  inner: { paddingVertical: 10 },
  rowText: { flex: 1, gap: 2, paddingVertical: 10 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowDescription: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowDetail: { fontSize: 13, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  choice: { gap: 10 },
  moveRow: { flexDirection: 'row', alignItems: 'stretch' },
  moveMain: { flex: 1 },
  arrows: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: StyleSheet.hairlineWidth },
  arrow: { width: 44, height: 56, alignItems: 'center', justifyContent: 'center' },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 46,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: -StyleSheet.hairlineWidth,
  },
  detailLabel: { fontSize: 14 },
  detailValue: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  detailText: { fontSize: 14, fontWeight: '500', textAlign: 'right', flexShrink: 1, ...tabular },
  stats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  stat: { width: '50%', gap: 2 },
  statValue: { fontSize: 24, fontWeight: '600', ...tabular },
  statUnit: { fontSize: 15, fontWeight: '400' },
  nameField: { gap: 10 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // An icon choice is a toggle button, so it has HeroUI's button corners, not a circle.
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius['3xl'],
    overflow: 'hidden',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
