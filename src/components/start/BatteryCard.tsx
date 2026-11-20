import { CarBattery } from 'lucide-react-native'
import { memo, useEffect, useId, useState } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import Svg, { Defs, G, Mask, Path } from 'react-native-svg'
import { PULSE_PAUSE_S, pulseSeconds } from '@/components/power/flowModel'
import { useReduceMotion } from '@/components/power/PowerFlow'
import { SourceLabel } from '@/components/power/SourceLabel'
import { MutedIcon, NoData, TitledCard, tabular } from '@/components/ui'
import { alpha, useTheme } from '@/theme'
import { batteryDial, type BatteryDialView } from './batteryDial'
import type { Battery } from '@/types'

// The dashboard's cockpit dial (`start/cockpit/CockpitDial.tsx`), as the battery card on its phone
// Start page draws it: a thin outer ring, a value band and a wide track, the band and track cut at
// the same five angles. One viewBox, so the geometry is in these units whatever the rendered size.
const SIZE = 260
const C = SIZE / 2
const SWEEP = 270
const FROM = -SWEEP / 2
const SEGMENTS = 5
const SEGMENT_SPAN = SWEEP / SEGMENTS
/** Gap between segments, in degrees (the "cuts"). */
const CUT = 1.6
const OUTER_R = 122
const OUTER_STROKE = 3
const BAND_R = 110
const BAND_STROKE = 10
const TRACK_R = 90
const TRACK_STROKE = 22
/** The dial is at most this wide; the readout's sizes are in px at that width and shrink with it. */
const MAX_W = 300

function arc(from: number, to: number, r: number) {
  const point = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return `${C + r * Math.cos(a)} ${C + r * Math.sin(a)}`
  }
  return `M ${point(from)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${point(to)}`
}

/** One arc per segment at radius `r`, shortened by the cut gap. */
function segments(r: number) {
  return Array.from({ length: SEGMENTS }, (_, i) =>
    arc(FROM + i * SEGMENT_SPAN + CUT / 2, FROM + (i + 1) * SEGMENT_SPAN - CUT / 2, r),
  )
}
const BAND_SEGMENTS = segments(BAND_R)
const TRACK_SEGMENTS = segments(TRACK_R)

const AnimatedPath = Animated.createAnimatedComponent(Path)
/** The pulse is a stack of dashes whose opacity falls off behind the leading edge: no hard edge. */
const SLICES = 10
const PEAK_OPACITY = 0.5
/** The band's length as a share of the full sweep. */
const BAND_SHARE = 0.14
/** One pass at the slowest pace, as the dashboard's dial (no clock: it starts when it mounts). */
const PASS_S = pulseSeconds(0, 1)

/**
 * The soft band that travels along the lit arc while the battery charges: in from before the start,
 * out past the end, a rest of `PULSE_PAUSE_S`, again. Dashes on the lit arc's own path, so it
 * cannot leave the fill. With the phone's "remove animations" setting on it is not drawn.
 */
function BatteryPulse({ litTo }: { litTo: number }) {
  const reduce = useReduceMotion()
  const [t] = useState(() => new Animated.Value(0))
  useEffect(() => {
    if (reduce) return
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: (PASS_S + PULSE_PAUSE_S) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [t, reduce])
  if (reduce || litTo <= FROM) return null

  const d = arc(FROM, litTo, BAND_R)
  const length = BAND_R * (((litTo - FROM) * Math.PI) / 180)
  const slice = (BAND_SHARE * length * SWEEP) / (litTo - FROM) / SLICES
  const pass = PASS_S / (PASS_S + PULSE_PAUSE_S)
  return (
    <G>
      {Array.from({ length: SLICES }, (_, i) => {
        // Slice 0 is the leading edge, the last the tail. The dash starts fully before the arc
        // (a positive offset shifts it back) and ends fully past it.
        const start = slice * (i + 1)
        const end = -(length + slice * (SLICES - i - 1))
        return (
          <AnimatedPath
            key={i}
            d={d}
            fill="none"
            stroke="white"
            strokeWidth={BAND_STROKE}
            strokeDasharray={[slice, length * 2]}
            opacity={PEAK_OPACITY * (1 - i / SLICES)}
            strokeDashoffset={t.interpolate({
              inputRange: [0, pass, 1],
              outputRange: [start, end, end],
            })}
          />
        )
      })}
    </G>
  )
}

/** `13.20V / 35W` with the units in the foreground colour and the numbers muted. */
function Sub({ sub, size }: { sub: string; size: number }) {
  const { colors } = useTheme()
  return (
    <Text style={[styles.sub, { color: colors.muted, fontSize: size, marginTop: size * 0.75 }]}>
      {sub.split(/(?<=\d)([VW])/).map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={{ color: colors.foreground }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  )
}

const BatteryDial = memo(function BatteryDial({ view }: { view: BatteryDialView }) {
  const { colors } = useTheme()
  const maskId = `cut-${useId().replace(/:/g, '')}`
  const [width, setWidth] = useState(0)
  const u = width / MAX_W
  const filledTo = FROM + (SWEEP * view.pct) / 100
  const fill = { stroke: view.color, strokeWidth: BAND_STROKE }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Battery ${Math.round(view.pct)}%`}
      // The arc's open ends sit 16.8% above the viewBox's bottom edge: that is dead space here.
      style={[styles.dial, { maxWidth: MAX_W, marginBottom: -0.12 * width }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <Mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={SIZE} height={SIZE}>
            {BAND_SEGMENTS.map((d) => (
              <Path key={d} d={d} fill="none" stroke="white" strokeWidth={BAND_STROKE} />
            ))}
          </Mask>
        </Defs>
        <Path
          d={arc(FROM, -FROM, OUTER_R)}
          fill="none"
          stroke={alpha(colors.foreground, 0.35)}
          strokeWidth={OUTER_STROKE}
          strokeLinecap="round"
        />
        {BAND_SEGMENTS.map((d) => (
          <Path
            key={d}
            d={d}
            fill="none"
            stroke={alpha(colors.foreground, 0.14)}
            strokeWidth={BAND_STROKE}
          />
        ))}
        {view.pct > 0 && (
          <G mask={`url(#${maskId})`}>
            <Path d={arc(FROM, filledTo, BAND_R)} fill="none" {...fill} />
            {view.charging && <BatteryPulse litTo={filledTo} />}
          </G>
        )}
        {TRACK_SEGMENTS.map((d) => (
          <Path
            key={d}
            d={d}
            fill="none"
            stroke={alpha(colors.foreground, 0.09)}
            strokeWidth={TRACK_STROKE}
          />
        ))}
      </Svg>

      {width > 0 && (
        <View style={styles.readout} pointerEvents="none" importantForAccessibility="no">
          <CarBattery size={16 * 1.2} color={colors.muted} />
          <Text style={[styles.label, { color: colors.muted, fontSize: 11 * u }]}>Battery</Text>
          <Text
            style={[styles.value, { color: colors.foreground, fontSize: 56 * u, marginTop: 4 * u }]}
          >
            {Math.round(view.pct)}
            <Text style={[styles.unit, { color: colors.accent, fontSize: 20 * u }]}>%</Text>
          </Text>
          <Sub sub={view.sub} size={14 * u} />
          {(view.timeToGo || view.state) && (
            <Text
              style={[styles.togo, { color: colors.muted, fontSize: 16 * u, marginTop: 8 * u }]}
            >
              {view.timeToGo ? (
                <>
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                    {view.timeToGo}
                  </Text>{' '}
                  to go
                </>
              ) : (
                view.state
              )}
            </Text>
          )}
        </View>
      )}
    </View>
  )
})

/** The Primary battery's cockpit dial in a card of its own (the dashboard's Battery widget). */
export function BatteryCard({
  batteries,
  selection,
}: {
  batteries: Record<string, Partial<Battery>>
  /** The shared Primary battery choice; Auto when absent. */
  selection?: string
}) {
  const { colors } = useTheme()
  const view = batteryDial(batteries, colors, selection)
  return (
    <TitledCard
      icon={<MutedIcon icon={CarBattery} />}
      title="Battery"
      right={<SourceLabel name={view?.source} />}
      contentStyle={styles.center}
    >
      {view ? (
        <BatteryDial view={view} />
      ) : (
        <NoData icon={<MutedIcon icon={CarBattery} />} label="Battery" />
      )}
    </TitledCard>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  dial: { width: '100%', aspectRatio: 1, alignSelf: 'center', marginTop: 12 },
  readout: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textTransform: 'uppercase', letterSpacing: 2.4 },
  value: { fontWeight: '300', fontStyle: 'italic', ...tabular },
  unit: { fontWeight: '600', fontStyle: 'normal' },
  sub: { textTransform: 'uppercase', letterSpacing: 1.6, ...tabular },
  togo: { ...tabular },
})
