import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { colors } from '../theme'

export interface RadialGaugeProps {
  /** 0-100. Values outside this range are clamped for the ring's sweep. */
  pct: number
  label: string
  sub?: string
  color?: string
}

const SIZE = 140
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Large radial gauge for a percentage value (`tank.level_pct`,
 * `battery.soc_pct`), per the same domain-tab + radial-gauge layout
 * decided for renewvan/dashboard (`prototype/dashboard-06` variant C).
 * Pure presentational component — props in, markup out.
 */
export function RadialGauge({ pct, label, sub, color = colors.accent }: RadialGaugeProps) {
  const clamped = Math.min(100, Math.max(0, pct))
  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100)

  return (
    <View style={styles.container} testID="radial-gauge">
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.panel2}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={color}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            rotation={-90}
            originX={SIZE / 2}
            originY={SIZE / 2}
          />
        </Svg>
        <View style={styles.hole} pointerEvents="none">
          <Text style={styles.value}>{Math.round(clamped)}%</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  hole: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { color: colors.text, fontSize: 28, fontWeight: '700' },
  label: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 4 },
  sub: { color: colors.textDim, fontSize: 13 },
})
