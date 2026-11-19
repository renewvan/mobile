import { Cable, Plug, PlugZap, Sun, type LucideIcon } from 'lucide-react-native'
import { memo, useEffect, useMemo, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg'
import {
  VAN_SIDE_H,
  VAN_SIDE_PATH,
  VAN_SIDE_W,
  VAN_SILHOUETTE_PATH,
} from '@/components/art/vanPaths'
import { tabular } from '@/components/ui'
import { formatTimeToGo } from '@/lib/time-to-go'
import type { PowerLayout } from '@/preferences/preferences'
import { alpha, radius, useTheme } from '@/theme'
import {
  BATTERY_STATE_LABEL,
  flowSeconds,
  formatPower,
  IDLE_W,
  inputWatts,
  type NodeId,
  type PowerSnapshot,
} from './flowModel'

// The Power page's diagram as the dashboard draws it on a phone: solar, alternator and shore
// charger wired into the van, the van out to the loads, and the battery's charge inside and under
// the van. Two layouts, the owner's choice in Settings, as on the dashboard: Van tiles (dashboard
// `components/power/VanTilesLayout.tsx`, boxed readings) and Van orbs (`VanOrbsLayout.tsx`, round
// ones with an arc for each one's share of the peak). The van is the same size and in the same
// place in both. The geometry is the dashboard's own 1200-unit frame, scaled to the card's width.

const FRAME_W = 1200
const FRAME_TOP = -10
const FRAME_H = 570
const VAN = { x: 410, y: 290.3, w: 380 }
const K = VAN.w / VAN_SIDE_W
const TILE_W = 250
const TILE_H = 210
const SOLAR_W = 320

type Side = 'l' | 'r' | 't'
interface Point {
  x: number
  y: number
}
interface Anchor {
  /** Where the wire meets the van. */
  port: Point
  /** Where the wire meets the tile. */
  end: Point
  side: Side
  /** The tile's box. */
  box: { x: number; y: number; w: number }
}

const onVan = (px: number, py: number): Point => ({ x: VAN.x + px * K, y: VAN.y + py * K })

const ANCHORS: Record<'solar' | 'alternator' | 'shore' | 'loads', Anchor> = {
  solar: {
    port: onVan(VAN_SIDE_W / 2, 1.25),
    end: { x: VAN.x + VAN.w / 2, y: 20 + TILE_H },
    side: 't',
    box: { x: VAN.x + VAN.w / 2 - SOLAR_W / 2, y: 20, w: SOLAR_W },
  },
  alternator: {
    port: onVan(3.7, 26),
    end: { x: 30 + TILE_W, y: 150 },
    side: 'l',
    box: { x: 30, y: 150 - TILE_H / 2, w: TILE_W },
  },
  shore: {
    port: onVan(1.25, 55.3),
    end: { x: 30 + TILE_W, y: 470 },
    side: 'l',
    box: { x: 30, y: 470 - TILE_H / 2, w: TILE_W },
  },
  loads: {
    port: onVan(108.68, 34),
    end: { x: FRAME_W - 30 - TILE_W, y: 150 },
    side: 'r',
    box: { x: FRAME_W - 30 - TILE_W, y: 150 - TILE_H / 2, w: TILE_W },
  },
}

type NodeKey = keyof typeof ANCHORS

// Van orbs. Each side column holds up to two orbs, stacked about the figure's vertical centre; a
// column with one puts it level with the van's side port instead.
const ORB_R = 115
const ORB_CIRC = 2 * Math.PI * ORB_R
/** The orbs reach lower than the tiles, and the lower one's label sits under it. */
const ORBS_FRAME_H = 640
const ORB_EDGE_GAP = 40
const ORB_STACK_GAP = 50
/** Space between an orb's ring and the label outside it. */
const ORB_LABEL_GAP = 24
const SIDE_Y = VAN.y + 30 * K
const SOLAR_Y = VAN.y - (ORB_R + 60)
const VAN_H = (VAN.w * VAN_SIDE_H) / VAN_SIDE_W
const COLUMN_Y = (SOLAR_Y - ORB_R + VAN.y + VAN_H + 100) / 2
const SLOT_UP_Y = COLUMN_Y - (ORB_R + ORB_STACK_GAP / 2)
const SLOT_DOWN_Y = COLUMN_Y + (ORB_R + ORB_STACK_GAP / 2)

interface Spot {
  /** Orb centre. */
  c: Point
  /** Port on the van the wire plugs into. */
  port: Point
  /** Which edge of the orb the wire leaves from. */
  side: Side
}

const SPOTS: Record<NodeKey, Spot> = {
  solar: { c: { x: FRAME_W / 2, y: SOLAR_Y }, port: ANCHORS.solar.port, side: 't' },
  alternator: {
    c: { x: ORB_EDGE_GAP + ORB_R, y: SLOT_UP_Y },
    port: ANCHORS.alternator.port,
    side: 'l',
  },
  shore: { c: { x: ORB_EDGE_GAP + ORB_R, y: SLOT_DOWN_Y }, port: ANCHORS.shore.port, side: 'l' },
  loads: {
    c: { x: FRAME_W - ORB_EDGE_GAP - ORB_R, y: SIDE_Y },
    port: ANCHORS.loads.port,
    side: 'r',
  },
}

/** Where the wire leaves the orb: the point of its ring nearest the van along its side. */
function orbEdge({ c, side }: Spot): Point {
  if (side === 'l') return { x: c.x + ORB_R, y: c.y }
  if (side === 'r') return { x: c.x - ORB_R, y: c.y }
  return { x: c.x, y: c.y + ORB_R }
}

// Memoised: an icon's props never change, so a new reading never redraws its SVG.
const ICONS: Record<NodeKey, LucideIcon> = {
  solar: memo(Sun) as unknown as LucideIcon,
  alternator: memo(Cable) as unknown as LucideIcon,
  shore: memo(PlugZap) as unknown as LucideIcon,
  loads: memo(Plug) as unknown as LucideIcon,
}

/** A wire between a tile and the van's port: an S-curve, leaving each end square to its edge. */
function wirePath(a: Point, b: Point, side: Side): string {
  return side === 't'
    ? `M${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`
    : `M${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`
}

const AnimatedPath = Animated.createAnimatedComponent(Path)

/** One dash and one gap: the distance the dashes travel per loop, so the loop has no seam. */
const DASH_PERIOD = 24

/**
 * The moving dashes on a live wire, as the dashboard draws them: they run along the wire in the
 * direction the power flows, faster the larger this wire's share of the peak. The wire's path is
 * drawn from where the power comes from to where it goes, so a falling dash offset moves them
 * forward. With the phone's "remove animations" setting on, the dashes are drawn but stand still.
 */
function FlowDashes({
  d,
  color,
  duration,
  still,
}: {
  d: string
  color: string
  /** Milliseconds for the dashes to advance one period (`dashDuration`). */
  duration: number
  still: boolean
}) {
  const [offset] = useState(() => new Animated.Value(0))
  useEffect(() => {
    if (still) return
    offset.setValue(0)
    const loop = Animated.loop(
      Animated.timing(offset, {
        toValue: -DASH_PERIOD,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [offset, duration, still])
  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={6}
      strokeLinecap="round"
      strokeDasharray={[3, DASH_PERIOD - 3]}
      strokeDashoffset={offset}
    />
  )
}

/**
 * The dash loop's period in steps of a quarter faster or slower: a reading that wanders by a few
 * watts must neither restart the loop nor redraw the wire, and a step that small is not seen.
 */
const DASH_STEP = Math.log(1.25)
function dashDuration(seconds: number): number {
  const ms = Math.max(100, seconds * 1000)
  return Math.round(100 * Math.exp(Math.round(Math.log(ms / 100) / DASH_STEP) * DASH_STEP))
}

/**
 * One wire: the grey line, and the moving dashes while power runs on it. Memoised, so a new
 * reading redraws a wire only when its speed (to a tenth of a second) or its on/off state changes.
 */
const Wire = memo(function Wire({
  d,
  active,
  duration,
  still,
}: {
  d: string
  active: boolean
  duration: number
  still: boolean
}) {
  const { colors } = useTheme()
  return (
    <G>
      <Path d={d} fill="none" stroke={colors.border} strokeWidth={4} strokeLinecap="round" />
      {active && <FlowDashes d={d} color={colors.accent} duration={duration} still={still} />}
    </G>
  )
})

/** Whether the phone asks apps to keep still (Settings › Accessibility › Remove animations). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let live = true
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (live) setReduce(on)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce)
    return () => {
      live = false
      subscription.remove()
    }
  }, [])
  return reduce
}

const TOP = 1.25
const BOTTOM = 66.752

/** The van, filled from the bottom to the battery's state of charge; danger at 20% and below. */
const VanArt = memo(function VanArt({ soc, width }: { soc: number | undefined; width: number }) {
  const { colors, isDark } = useTheme()
  const low = soc !== undefined && soc <= 20
  const colour = low ? colors.danger : colors.accent
  const level = (BOTTOM - TOP) * Math.min(1, Math.max(0, (soc ?? 0) / 100))
  return (
    <Svg
      width={width}
      height={(width * VAN_SIDE_H) / VAN_SIDE_W}
      viewBox={`0 0 ${VAN_SIDE_W} ${VAN_SIDE_H}`}
    >
      <Defs>
        <ClipPath id="van-body">
          <Path d={VAN_SILHOUETTE_PATH} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#van-body)">
        <Rect x={0} y={0} width={VAN_SIDE_W} height={VAN_SIDE_H} fill={colors.surface} />
        <Rect
          x={0}
          y={BOTTOM - level}
          width={VAN_SIDE_W}
          height={level}
          fill={alpha(colour, isDark ? 0.35 : 0.16)}
        />
      </G>
      <Path
        d={VAN_SIDE_PATH}
        fill="none"
        stroke={colour}
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
})

const GRIDLINES = [25, 50, 75]

/** The charge bar under the van, in the style of the Tanks tab's level bar. */
const ChargeBar = memo(function ChargeBar({ soc }: { soc: number | undefined }) {
  const { colors } = useTheme()
  const pct = Math.max(0, Math.min(100, soc ?? 0))
  const low = soc !== undefined && soc <= 20
  return (
    <View
      style={[styles.bar, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
    >
      <View
        style={[
          styles.barFill,
          { width: `${pct}%`, backgroundColor: low ? colors.danger : colors.accent },
        ]}
      />
      {GRIDLINES.map((mark) => (
        <View
          key={mark}
          style={[
            styles.barLine,
            { left: `${mark}%`, backgroundColor: alpha(colors.foreground, 0.35) },
          ]}
        />
      ))}
    </View>
  )
})

/** An orb's ring, filled clockwise from the top with `share` (0–1) of the peak. */
const OrbRing = memo(function OrbRing({ x, y, share }: { x: number; y: number; share: number }) {
  const { colors } = useTheme()
  return (
    <G>
      <Circle
        cx={x}
        cy={y}
        r={ORB_R}
        fill={colors.surface}
        stroke={colors.accent}
        strokeOpacity={0.25}
        strokeWidth={6}
      />
      {share > 0 && (
        <Circle
          cx={x}
          cy={y}
          r={ORB_R}
          fill="none"
          stroke={colors.accent}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${ORB_CIRC * share} ${ORB_CIRC}`}
          transform={`rotate(-90 ${x} ${y})`}
        />
      )}
    </G>
  )
})

interface ReadoutProps {
  id: NodeKey
  label: string
  /** `formatPower`'s parts: the readout redraws only when what it shows changes. */
  value: string
  unit: string
  scale: number
}

/** An orb's icon, reading and label, over its ring; centred on (`x`, `y`) in the frame. */
const OrbReadout = memo(function OrbReadout({
  id,
  label,
  value,
  unit,
  x,
  y,
  scale,
}: ReadoutProps & { x: number; y: number }) {
  const { colors } = useTheme()
  const Icon = ICONS[id]
  const size = ORB_R * 2 * scale
  const left = (x - ORB_R) * scale
  const top = (y - ORB_R - FRAME_TOP) * scale
  // The label sits outside the ring: left of the Solar orb (above it would crowd the card's
  // title), under the lower orb of a stacked pair, above any other.
  const beside = id === 'solar'
  const below = y === SLOT_DOWN_Y
  const labelGap = ORB_LABEL_GAP * scale
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value} ${unit}`}
      style={{ position: 'absolute', left, top, width: size, height: size }}
    >
      <View style={styles.orb}>
        <Icon size={15} color={colors.accent} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.orbValue, { color: colors.foreground }]}
        >
          {value}
          <Text style={[styles.tileUnit, { color: colors.accent }]}> {unit}</Text>
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.orbLabel,
          { color: colors.muted },
          beside
            ? { right: size + labelGap, top: size / 2 - 8, textAlign: 'right' }
            : below
              ? { top: size + labelGap / 2, left: -20, right: -20 }
              : { bottom: size + labelGap / 2, left: -20, right: -20 },
        ]}
      >
        {label}
      </Text>
    </View>
  )
})

/** A boxed reading (Van tiles), outlined in the accent while power runs through it. */
const Tile = memo(function Tile({
  id,
  label,
  value,
  unit,
  active,
  scale,
}: ReadoutProps & { active: boolean }) {
  const { colors } = useTheme()
  const a = ANCHORS[id]
  const Icon = ICONS[id]
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value} ${unit}`}
      style={[
        styles.tile,
        {
          left: a.box.x * scale,
          top: (a.box.y - FRAME_TOP) * scale,
          width: a.box.w * scale,
          height: TILE_H * scale,
          backgroundColor: colors.surface,
          borderColor: active ? colors.accent : colors.border,
        },
        active && { elevation: 6, shadowColor: colors.accent },
      ]}
    >
      <View style={styles.tileLabel}>
        <Icon size={12} color={colors.muted} />
        <Text
          // One word stays on one line and shrinks to fit; it is never broken mid-word.
          numberOfLines={label.includes(' ') ? 2 : 1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[styles.tileName, { color: colors.muted }]}
        >
          {label}
        </Text>
      </View>
      <Text style={[styles.tileValue, { color: colors.foreground }]}>
        {value}
        <Text style={[styles.tileUnit, { color: colors.accent }]}> {unit}</Text>
      </Text>
    </View>
  )
})

/**
 * The power-flow diagram and the battery readout under it, in the layout chosen in Settings. Draws
 * nothing until it knows its width.
 */
export function PowerFlow({
  flow,
  layout = 'van-tiles',
}: {
  flow: PowerSnapshot
  layout?: PowerLayout
}) {
  const { colors } = useTheme()
  const [width, setWidth] = useState(0)
  const scale = width / FRAME_W
  const orbs = layout === 'van-orbs'
  const reduceMotion = useReduceMotion()
  const frameH = orbs ? ORBS_FRAME_H : FRAME_H
  const sources = (['solar', 'alternator', 'shore'] as const).filter((id) => flow.nodes[id].present)
  const all = [...sources, 'loads'] as const
  const out = flow.edges.find((e) => e.to === 'loads')?.watts ?? 0
  const wattsOf = (id: NodeId) => (id === 'loads' ? out : (flow.nodes[id].watts ?? 0))
  const batteryW = flow.nodes.battery.watts
  const battery = formatPower(batteryW === undefined ? undefined : Math.abs(batteryW))
  const togo = flow.timeToGoS === undefined ? undefined : formatTimeToGo(flow.timeToGoS)
  // To the percent shown: the van's fill and the bar redraw only when the figure does.
  const soc = flow.soc === undefined ? undefined : Math.round(flow.soc)
  const charging = flow.batteryState !== 'unknown' && inputWatts(flow) > IDLE_W
  // A left column with a single orb puts it level with the van's side port.
  const leftCount = sources.filter((id) => id !== 'solar').length
  const spotOf = (id: NodeKey): Spot => {
    const spot = SPOTS[id]
    return leftCount === 1 && (id === 'alternator' || id === 'shore')
      ? { ...spot, c: { ...spot.c, y: SIDE_Y } }
      : spot
  }
  /** The wire between a reading and the van, drawn in the direction the power runs. */
  const wireOf = (id: NodeKey): string => {
    const port = ANCHORS[id].port
    const side = ANCHORS[id].side
    const end = orbs ? orbEdge(spotOf(id)) : ANCHORS[id].end
    return id === 'loads' ? wirePath(port, end, side) : wirePath(end, port, side)
  }

  // The wires and rings, redrawn only when one of them changes: what each draws, as one key.
  const wires = all.map((id) => {
    const active = wattsOf(id) > IDLE_W
    return {
      id,
      d: wireOf(id),
      active,
      // Unused while idle: a constant keeps an idle wire from redrawing.
      duration: active ? dashDuration(flowSeconds(wattsOf(id), flow.peakW) / 6) : 0,
      ...spotOf(id).c,
      // The ring fills clockwise from the top with this reading's share of the peak, to a
      // percent: finer than that is invisible, and would redraw the ring every reading.
      share: Math.round(Math.min(1, Math.abs(wattsOf(id)) / flow.peakW) * 100) / 100,
    }
  })
  const wiresKey = JSON.stringify(wires)
  const wireLayer = useMemo(
    () => (
      <Svg
        width={width}
        height={frameH * scale}
        viewBox={`0 ${FRAME_TOP} ${FRAME_W} ${frameH}`}
        style={StyleSheet.absoluteFill}
      >
        {wires.map(({ id, d, active, duration }) => (
          <Wire key={id} d={d} active={active} duration={duration} still={reduceMotion} />
        ))}
        {orbs && wires.map(({ id, x, y, share }) => <OrbRing key={id} x={x} y={y} share={share} />)}
      </Svg>
    ),
    // `wires` is read through its key: a new array with the same contents draws the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wiresKey, width, frameH, scale, orbs, reduceMotion],
  )

  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <View style={{ width, height: frameH * scale }}>
          {wireLayer}

          <View
            style={{
              position: 'absolute',
              left: VAN.x * scale,
              top: (VAN.y - FRAME_TOP) * scale,
              opacity: charging || flow.batteryState !== 'unknown' ? 1 : 0.6,
            }}
          >
            <VanArt soc={soc} width={VAN.w * scale} />
          </View>

          {orbs &&
            all.map((id) => {
              const spot = spotOf(id)
              const power = formatPower(flow.nodes[id].watts)
              return (
                <OrbReadout
                  key={id}
                  id={id}
                  label={flow.nodes[id].label}
                  value={power.value}
                  unit={power.unit}
                  x={spot.c.x}
                  y={spot.c.y}
                  scale={scale}
                />
              )
            })}

          {!orbs &&
            all.map((id) => {
              const power = formatPower(flow.nodes[id].watts)
              return (
                <Tile
                  key={id}
                  id={id}
                  label={flow.nodes[id].label}
                  value={power.value}
                  unit={power.unit}
                  active={wattsOf(id) > IDLE_W}
                  scale={scale}
                />
              )
            })}
        </View>
      )}

      <View style={styles.soc}>
        <View style={styles.socBar}>
          <ChargeBar soc={soc} />
        </View>
        <Text style={[styles.socText, { color: colors.foreground }]}>
          {soc === undefined ? '—' : `${soc}%`}
        </Text>
      </View>
      <View style={styles.state}>
        <Text style={[styles.stateWatts, { color: colors.muted }]}>
          {batteryW !== undefined && batteryW < 0 ? '−' : '+'}
          {battery.value} {battery.unit}
        </Text>
        <Text style={[styles.stateLabel, { color: colors.muted }]}>
          {BATTERY_STATE_LABEL[flow.batteryState]}
        </Text>
        {togo ? (
          <Text style={[styles.stateTogo, { color: colors.foreground }]}>· {togo}</Text>
        ) : null}
      </View>
      {flow.bmsAlert ? (
        <Text style={[styles.alert, { color: colors[flow.bmsAlert.tone] }]}>
          {flow.bmsAlert.names.join(' · ')}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', alignItems: 'center', gap: 8 },
  tile: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: radius.control,
    paddingHorizontal: 6,
    justifyContent: 'center',
    gap: 2,
  },
  orb: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1, paddingHorizontal: 6 },
  orbValue: { fontSize: 15, fontWeight: '300', fontStyle: 'italic', ...tabular },
  orbLabel: { position: 'absolute', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  tileLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileName: { fontSize: 10, lineHeight: 12, flexShrink: 1 },
  tileValue: { fontSize: 16, fontWeight: '300', fontStyle: 'italic', ...tabular },
  tileUnit: { fontSize: 10, fontWeight: '700', fontStyle: 'normal' },
  soc: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  socBar: { width: 96 },
  socText: { fontSize: 20, ...tabular },
  bar: { height: 24, borderRadius: radius.control, borderWidth: 2, overflow: 'hidden' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  barLine: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth * 2 },
  state: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 10 },
  stateWatts: { fontSize: 16, ...tabular },
  stateLabel: { fontSize: 18 },
  stateTogo: { fontSize: 16, ...tabular },
  alert: { fontSize: 14, textAlign: 'center' },
})
