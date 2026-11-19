import {
  Droplet,
  Flame,
  Fuel,
  Gauge,
  Thermometer,
  Waves,
  WavesArrowDown,
  WavesArrowUp,
  type LucideIcon,
} from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { Card, CardHeader, Chip, InfoField, tabular } from '@/components/ui'
import { EntityIcon } from '@/components/EntityIcon'
import type { TankSeverity } from '@/lib/tank-alarm'
import { alpha, radius, useTheme, type Palette } from '@/theme'
import type { FluidType, Tank } from '@/types'
import { tankView } from './tankView'

export const FLUID_ICONS: Record<FluidType, LucideIcon> = {
  fresh_water: Droplet,
  grey_water: Waves,
  black_water: Waves,
  fuel: Fuel,
  lpg: Flame,
}

const GRIDLINES = [25, 50, 75]

/** Solid gauge fill. `success` only ever marks a badge; a fill is never green. */
function fillColor(colors: Palette, severity: TankSeverity): string {
  return severity === 'danger'
    ? colors.danger
    : severity === 'warning'
      ? colors.warning
      : colors.accent
}

/** Status text colour; the accent wording reads as plain text. */
function textColor(colors: Palette, severity: TankSeverity): string | undefined {
  return severity === 'accent' ? undefined : colors[severity]
}

/**
 * One tank, as the dashboard's phone row: name and badge, the percentage large above a horizontal
 * fill bar with 25/50/75% gridlines, then status, temperature and the drain or fill pace.
 */
export function TankCard({
  tank,
  now,
  icon,
}: {
  tank: Tank
  now: Date
  /** The icon picked for this tank in Settings (a shared hub setting), by name. */
  icon?: string
}) {
  const { colors } = useTheme()
  const view = tankView(tank, now)
  const RateIcon = view.isRefill ? WavesArrowDown : WavesArrowUp

  return (
    <Card>
      <CardHeader
        icon={
          <EntityIcon
            name={icon}
            fallback={FLUID_ICONS[tank.fluid_type]}
            size={16}
            color={colors.muted}
          />
        }
        title={view.fluidLabel}
        right={<Chip label={view.badge.label} tone={view.badge.severity} />}
      />
      <View style={styles.content}>
        {!view.faulted && (
          <View style={styles.readout}>
            <Text style={[styles.pct, { color: colors.foreground }]}>{view.pct.toFixed(0)}%</Text>
            <Text style={[styles.litres, { color: colors.muted }]}>
              {view.litres}/{view.capacityL} {'ℓ'}
            </Text>
          </View>
        )}
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(view.pct) }}
          style={[
            styles.track,
            { borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <View
            style={[
              styles.fill,
              { width: `${view.pct}%`, backgroundColor: fillColor(colors, view.severity) },
            ]}
          />
          {GRIDLINES.map((mark) => (
            <View
              key={mark}
              style={[
                styles.gridline,
                { left: `${mark}%`, backgroundColor: alpha(colors.foreground, 0.35) },
              ]}
            />
          ))}
        </View>
        <View style={styles.stats}>
          {view.status && (
            <InfoField
              icon={<Gauge size={16} color={colors.accent} />}
              label="Status"
              value={view.status.label}
              valueColor={textColor(colors, view.status.severity)}
            />
          )}
          <InfoField
            icon={<Thermometer size={16} color={colors.accent} />}
            label="Temperature"
            value={view.temperature}
          />
          <InfoField
            icon={<RateIcon size={16} color={colors.accent} />}
            label={view.rateLabel}
            value={view.rate}
          />
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 8 },
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  pct: { fontSize: 36, lineHeight: 40, fontWeight: '600', ...tabular },
  litres: { fontSize: 14, fontWeight: '600', ...tabular },
  track: { height: 24, borderRadius: radius.control, borderWidth: 2, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  gridline: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth * 2 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 16 },
})
