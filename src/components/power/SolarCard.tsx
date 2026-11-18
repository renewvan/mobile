import { memo, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { tabular } from '@/components/ui'
import {
  formatYield,
  formatYieldAmount,
  yieldAxis,
  yieldHistoryView,
  type YieldHistoryView,
} from '@/components/widgets/solar/solarView'
import { alpha, radius, useTheme } from '@/theme'
import type { Solar } from '@/types'
import { formatPower } from './flowModel'

const HISTORY_DAYS = 14
const CHART_H = 128

function dayLabel(daysAgo: number): string {
  if (daysAgo === 0) return 'today'
  return daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`
}

/** Every day read aloud, oldest first: the chart is one image to a screen reader. */
function describe(view: YieldHistoryView): string {
  return view.days
    .map(({ daysAgo, wh }) =>
      wh === null
        ? `${dayLabel(daysAgo)}: no data`
        : `${dayLabel(daysAgo)}: ${formatYield(wh)} kWh`,
    )
    .join(', ')
}

/**
 * One day's harvest. Memoised: today's entry grows with the sun while the older days stay put, so
 * only today's bar redraws.
 */
const DayBar = memo(function DayBar({
  wh,
  maxKwh,
  today,
}: {
  wh: number | null
  maxKwh: number
  today: boolean
}) {
  const { colors } = useTheme()
  const share = wh === null ? 0 : wh / 1000 / maxKwh
  return (
    <View style={styles.day}>
      <View
        style={[
          styles.dayBar,
          wh === null
            ? {
                height: 5,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: alpha(colors.foreground, 0.3),
              }
            : {
                // A real day that harvested nothing is a thin line, not a gap.
                height: wh === 0 ? 2 : Math.max(share * CHART_H, 5),
                backgroundColor: today ? colors.accent : alpha(colors.foreground, 0.4),
              },
        ]}
      />
    </View>
  )
})

/**
 * Daily harvest as bars, oldest on the left, today in the accent colour, on a kWh axis. Memoised:
 * the log changes with today's harvest, the live power several times a second.
 */
const SolarHistory = memo(function SolarHistory({ view }: { view: YieldHistoryView }) {
  const { colors } = useTheme()
  const axis = yieldAxis(view.referenceWh)
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.chartRow}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Solar harvest, last ${view.days.length} days. ${describe(view)}`}
          style={styles.plot}
        >
          {axis.ticks.map((kwh) => (
            <View
              key={kwh}
              style={[
                styles.gridline,
                {
                  bottom: (kwh / axis.maxKwh) * CHART_H,
                  backgroundColor: alpha(colors.foreground, 0.15),
                },
              ]}
            />
          ))}
          {view.days.map(({ daysAgo, wh }) => (
            <DayBar key={daysAgo} wh={wh} maxKwh={axis.maxKwh} today={daysAgo === 0} />
          ))}
        </View>
        <View style={styles.axis}>
          {axis.ticks.map((kwh) => (
            <Text
              key={kwh}
              style={[
                styles.tick,
                { color: colors.muted, bottom: (kwh / axis.maxKwh) * CHART_H - 6 },
              ]}
            >
              {kwh}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: colors.muted }]}>{view.days.length} days</Text>
        <Text style={[styles.legendText, { color: colors.muted }]}>kWh</Text>
        <Text style={[styles.legendText, { color: colors.muted }]}>today</Text>
      </View>
    </View>
  )
})

/**
 * The solar controller's live power, today's harvest and the last days as bars (dashboard
 * `start/SolarCard`). The history is the controller's own retained log on the bus; there is no
 * chart until it publishes one.
 */
export function SolarCard({ solar }: { solar: Solar }) {
  const { colors } = useTheme()
  const log = solar.yield_history_wh
  const history = useMemo(() => yieldHistoryView(log, HISTORY_DAYS), [log])
  const power = formatPower(Math.round(solar.power_w))
  const today =
    solar.yield_today_wh === undefined ? undefined : formatYieldAmount(solar.yield_today_wh)
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Text style={[styles.watts, { color: colors.foreground }]}>
          {power.value}
          <Text style={[styles.wattsUnit, { color: colors.muted }]}> {power.unit}</Text>
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          <Text style={[styles.today, { color: colors.foreground }]}>{today?.value ?? '—'}</Text>{' '}
          {today?.unit ?? 'kWh'} today
        </Text>
      </View>
      {history && <SolarHistory view={history} />}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: 16 },
  top: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  watts: { fontSize: 36, lineHeight: 40, fontWeight: '600', ...tabular },
  wattsUnit: { fontSize: 18, fontWeight: '500' },
  today: { fontWeight: '600', ...tabular },
  chartRow: { flexDirection: 'row', gap: 6 },
  plot: { flex: 1, height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  gridline: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  day: { flex: 1, height: CHART_H, justifyContent: 'flex-end' },
  dayBar: { borderRadius: radius.lg },
  axis: { width: 22, height: CHART_H },
  tick: { position: 'absolute', right: 0, fontSize: 10, ...tabular },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginRight: 28 },
  legendText: { fontSize: 10 },
})
