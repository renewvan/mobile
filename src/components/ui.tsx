import type { LucideIcon } from 'lucide-react-native'
import { memo, type ReactNode } from 'react'
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { alpha, layout, radius, useTheme, type Palette } from '@/theme'

// The small building blocks every tab shares, drawn the way the dashboard's phone layout draws
// them: a titled card, a status chip, a one-line banner and the "nothing yet" state.

export type Tone = 'accent' | 'success' | 'warning' | 'danger'

export function toneColor(colors: Palette, tone: Tone): string {
  return colors[tone]
}

/** A page card: surface, hairline border, rounded. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.separator },
        style,
      ]}
    >
      {children}
    </View>
  )
}

/**
 * A card's icon in the muted colour. Memoised: a card redraws with every reading in it, and a
 * Lucide icon is a whole SVG, so it would redraw with them.
 */
export const MutedIcon = memo(function MutedIcon({
  icon: Icon,
  size = 16,
}: {
  icon: LucideIcon
  size?: number
}) {
  const { colors } = useTheme()
  return <Icon size={size} color={colors.muted} />
})

/** The title row every card on a page shares: icon, title, and whatever sits at the right. */
export function CardHeader({
  icon,
  title,
  right,
}: {
  icon?: ReactNode
  title: string
  right?: ReactNode
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.header}>
      <View style={styles.headerTitle}>
        {icon}
        <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  )
}

/** A card with its title row and padded content: the dashboard's `PhoneCard`. */
export function TitledCard({
  icon,
  title,
  right,
  children,
  contentStyle,
}: {
  icon?: ReactNode
  title: string
  right?: ReactNode
  children: ReactNode
  contentStyle?: StyleProp<ViewStyle>
}) {
  return (
    <Card>
      <CardHeader icon={icon} title={title} right={right} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Card>
  )
}

/** A soft status chip: a wash of the tone with the tone's own colour as text. */
export function Chip({ label, tone }: { label: string; tone: Tone }) {
  const { colors, isDark } = useTheme()
  const color = toneColor(colors, tone)
  return (
    <View style={[styles.chip, { backgroundColor: alpha(color, isDark ? 0.18 : 0.14) }]}>
      <Text style={[styles.chipText, { color: isDark || tone !== 'warning' ? color : '#8a5a00' }]}>
        {label}
      </Text>
    </View>
  )
}

/** A solid chip in an arbitrary colour (the temperature bands). */
export function SolidChip({ label, color, fg }: { label: string; color: string; fg: string }) {
  return (
    <View style={[styles.chip, styles.pill, { backgroundColor: color }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  )
}

/** The one-line note above a page: why its controls are off. */
export function Banner({ children, tone }: { children: string; tone?: Tone }) {
  const { colors } = useTheme()
  const color = tone ? toneColor(colors, tone) : undefined
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: color ? alpha(color, 0.14) : colors.surface }]}
    >
      <Text style={[styles.bannerText, { color: color ?? colors.muted }]}>{children}</Text>
    </View>
  )
}

/** A whole tab with nothing to show yet. */
export function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: ReactNode
  title: string
  detail?: string
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      {detail ? <Text style={[styles.emptyDetail, { color: colors.muted }]}>{detail}</Text> : null}
    </View>
  )
}

/** One card's "No data yet", for a widget whose source has not published. */
export function NoData({ icon, label }: { icon: ReactNode; label: string }) {
  const { colors } = useTheme()
  return (
    <View accessibilityRole="text" style={styles.noData}>
      {icon}
      <Text style={[styles.noDataLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={{ color: colors.muted, fontSize: 14 }}>No data yet</Text>
    </View>
  )
}

/** One telemetry field: accent icon and muted label, bold value beneath. */
export function InfoField({
  icon,
  label,
  value,
  valueColor,
  style,
}: {
  icon?: ReactNode
  label: string
  value: string
  valueColor?: string
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useTheme()
  return (
    <View style={[styles.field, style]}>
      <View style={styles.fieldLabel}>
        {icon}
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>
          {label}
        </Text>
      </View>
      <Text style={[styles.fieldValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
    </View>
  )
}

/** Digits that do not jiggle as they change. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] }

const styles = StyleSheet.create({
  card: {
    borderRadius: layout.radius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 48,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  title: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 20, gap: 16 },
  pill: { borderRadius: 999 },
  chip: { borderRadius: radius['2xl'], paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 12, fontWeight: '600' },
  banner: { borderRadius: radius.xl, paddingHorizontal: 12, paddingVertical: 8 },
  bannerText: { fontSize: 12 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    minHeight: 360,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptyDetail: { fontSize: 14, textAlign: 'center' },
  noData: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 40 },
  noDataLabel: { fontSize: 14, fontWeight: '600' },
  field: { gap: 4, flex: 1 },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldValue: { fontSize: 14, fontWeight: '600', ...tabular },
})
