import {
  Camera,
  Map as MapView,
  Marker,
  type CameraRef,
  type MapRef,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native'
import {
  Info,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Minus,
  Navigation,
  Plus,
  Satellite,
  type LucideIcon,
} from 'lucide-react-native'
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react'
import { Button, Dialog } from 'heroui-native'
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import {
  VAN_BODY_PATH,
  VAN_BUMPER_PATH,
  VAN_GLASS_PATHS,
  VAN_HEADLIGHT_PATH,
  VAN_HUBS,
  VAN_SIDE_H,
  VAN_SIDE_PATH,
  VAN_SIDE_W,
  VAN_TAILLIGHT_PATH,
  VAN_TYRE_PATHS,
} from '@/components/art/vanPaths'
import { tabular } from '@/components/ui'
import { basemapStyle, type MapTheme } from '@/lib/mapStyle'
import { sideViewRotation, tiltReading } from '@/lib/tilt'
import { compassPoint, facesLeft, headingDeg } from '@/lib/vanMarker'
import { useOverlayTop } from '@/components/settings/kit'
import { useSession } from '@/session/SessionProvider'
import { radius, useTheme } from '@/theme'
import { hasGpsFix, isCompleteGps, type Gps } from '@/types'
import { readLastPosition, rememberPosition, type LatLon } from './lastPosition'

// The van on a map, as the dashboard's Map page draws it (dashboard `components/map/MapPage.tsx`):
// a native MapLibre map of the same Protomaps style, read from the same offline `basemap.pmtiles`
// the hub serves, with the van drawn at the hub's GPS fix and a fix / satellites / speed / heading
// readout over its corner. Nothing falls back to an online map: outside the file's area, or
// without the file, the map is the style's empty ground with the van on it.

/** Close enough to read streets, for a van that has a position. */
const ZOOM = 15
/**
 * Where the map opens for a van that has never had a position: Freiburg Münster, the middle of the
 * region the dashboard's basemap extract covers.
 */
const DEFAULT_CENTRE: LatLon = [47.9958, 7.8528]

/** The ground alone, in the map's own colours, for a phone with no hub to read the basemap from. */
function emptyStyle(theme: MapTheme): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': theme === 'dark' ? '#262830' : '#f1ede4' },
      },
    ],
  }
}

/** Dark glass, a faint white border and white text: the look of everything laid over the map. */
function Glass({
  children,
  style,
  status,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  /** Announced when it appears: a notice, not a control. */
  status?: boolean
}) {
  return (
    <View
      accessibilityRole={status ? 'alert' : undefined}
      pointerEvents={status ? 'none' : 'auto'}
      style={[styles.glass, style]}
    >
      {children}
    </View>
  )
}

/** A 44pt glass button over the map. */
function MapButton({
  icon: Icon,
  label,
  disabled,
  onPress,
}: {
  icon: LucideIcon
  label: string
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      onPress={onPress}
      style={[styles.glass, styles.button, { opacity: disabled ? 0.5 : 1 }]}
    >
      <Icon size={20} color="#ffffff" />
    </Pressable>
  )
}

const VAN_W = 58
const VAN_H = (VAN_W * VAN_SIDE_H) / VAN_SIDE_W
const OUTLINE = '#0f172a'
const GLASS_GREY = '#9e9e9e'

/**
 * The van on the map: the filled side view, in the accent colour. It mirrors to face the way it is
 * heading and pitches with the tilt sensor, pivoting on its wheels as the tilt widget does.
 */
const VanArt = memo(function VanArt({
  heading,
  pitch,
}: {
  heading: number | null
  pitch: number | null
}) {
  const { colors } = useTheme()
  return (
    <View
      // The mirror also flips the child's rotation, so a left-facing van's nose-up pitch is still
      // the plain value: it turns the other way on screen.
      style={{
        width: VAN_W,
        height: VAN_H,
        transform: [{ scaleX: facesLeft(heading) ? -1 : 1 }],
      }}
    >
      <View
        style={{
          transformOrigin: 'bottom',
          transform: [{ rotate: `${sideViewRotation(pitch)}deg` }],
        }}
      >
        <Svg width={VAN_W} height={VAN_H} viewBox={`0 0 ${VAN_SIDE_W} ${VAN_SIDE_H}`}>
          <Path d={VAN_BODY_PATH} fill={colors.accent} />
          <Path d={VAN_BUMPER_PATH} fill={colors.accent} />
          {VAN_GLASS_PATHS.map((d) => (
            <Path key={d} d={d} fill={GLASS_GREY} />
          ))}
          {VAN_TYRE_PATHS.map((d) => (
            <Path key={d} d={d} fill={OUTLINE} />
          ))}
          <Path d={VAN_HEADLIGHT_PATH} fill="#ffffff" />
          <Path d={VAN_TAILLIGHT_PATH} fill="#ef4444" />
          {VAN_HUBS.map(([cx, cy]) => (
            <Circle key={cx} cx={cx} cy={cy} r={4.2} fill={GLASS_GREY} />
          ))}
          <Path
            d={VAN_SIDE_PATH}
            fill="none"
            stroke={OUTLINE}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  )
})

/** `47.9955° N, 7.8529° E`: where the van is, to about ten metres. */
export function formatCoordinates(latitude: number, longitude: number): string {
  const part = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(4)}° ${value < 0 ? negative : positive}`
  return `${part(latitude, 'N', 'S')}, ${part(longitude, 'E', 'W')}`
}

/** The fix / position / satellites / speed / heading readout over the map's bottom-left corner. */
function Readout({ record, heading }: { record: Gps; heading: number | null }) {
  const { colors } = useTheme()
  return (
    <Glass style={styles.readout}>
      {record.latitude !== undefined && record.longitude !== undefined && (
        <View style={styles.row}>
          <MapPin size={16} color="#ffffff" />
          <Text selectable style={[styles.place, tabular]}>
            {formatCoordinates(record.latitude, record.longitude)}
          </Text>
        </View>
      )}
      <View style={styles.figures}>
        <View style={[styles.fix, { backgroundColor: colors.success }]}>
          <Text style={[styles.fixText, { color: colors.successForeground }]}>
            {record.fix_quality.toUpperCase()}
          </Text>
        </View>
        <View
          style={styles.row}
          accessible
          accessibilityLabel={`${record.satellites_in_use} satellites in use`}
        >
          <Satellite size={16} color="#ffffff" />
          <Text style={styles.figure}>{record.satellites_in_use}</Text>
        </View>
        {record.speed_kmh !== undefined && (
          <Text style={[styles.figure, styles.strong, tabular]}>
            {record.speed_kmh.toFixed(0)} km/h
          </Text>
        )}
        {heading !== null && (
          <View style={styles.row}>
            {/* The icon points up-right at rest, so 45° off its drawn direction is north. */}
            <View style={{ transform: [{ rotate: `${heading - 45}deg` }] }}>
              <Navigation size={16} color="#ffffff" />
            </View>
            <Text style={[styles.figure, styles.strong, tabular]}>
              {compassPoint(heading)} {heading.toFixed(0)}°
            </Text>
          </View>
        )}
      </View>
    </Glass>
  )
}

/** Why there is no van on the map: no GPS data from the hub, or no fix yet. */
function GpsNotice({ satellites }: { satellites: number | undefined }) {
  const waitingForFix = satellites !== undefined
  return (
    <Glass status style={[styles.readout, styles.notice]}>
      <Satellite size={16} color="#ef4444" />
      <View style={styles.noticeText}>
        <Text style={styles.place}>{waitingForFix ? 'No GPS fix yet' : 'No GPS data yet'}</Text>
        <Text style={styles.detail}>
          {waitingForFix
            ? `Tracking ${satellites} satellite(s), waiting for a fix.`
            : 'Waiting for readings from the renewvan hub.'}
        </Text>
      </View>
    </Glass>
  )
}

export interface VanMapProps {
  /**
   * `page` is the full map: it fills its parent and can be dragged and pinched. `card` is the Start
   * tab's widget: it sits in a scrolling page, so it stays still (the page scrolls under the
   * finger) and offers a button to open the full map.
   */
  variant: 'page' | 'card'
  /** The card's button to the full map. */
  onExpand?: () => void
}

/**
 * Reads the bus and hands the map only what it draws, so a message about anything else (a battery,
 * a tank) does not re-render it: `VanMapView` is memoised on these.
 */
export function VanMap(props: VanMapProps) {
  const { state } = useRenewvanBus()
  // MQTT builds a record up one property per retained message; the first complete one decides
  // (there is a single GPS receiver per hub). `no_fix` is complete, with no coordinates to plot.
  const id = Object.keys(state.gps).find((key) => isCompleteGps(state.gps[key]))
  const { pitch } = tiltReading(Object.values(state.tilt)[0])
  // The van pitches to the nearest half degree: a sensor's noise below that, redrawn at every
  // message, cost the Start tab more than any other widget.
  const shownPitch = pitch === null ? null : Math.round(pitch * 2) / 2
  return <VanMapView {...props} record={id ? state.gps[id] : undefined} pitch={shownPitch} />
}

const VanMapView = memo(function VanMapView({
  variant,
  onExpand,
  record,
  pitch,
}: VanMapProps & { record: Gps | undefined; pitch: number | null }) {
  const { connection } = useSession()
  const { isDark } = useTheme()
  const isCard = variant === 'card'
  // The full page runs to the screen's bottom edge: keep the readout off the gesture bar.
  const insets = useSafeAreaInsets()
  const bottomInset = isCard ? 0 : insets.bottom
  // …and runs up under a see-through app bar: keep the buttons below it.
  const overlayTop = useOverlayTop()
  const topInset = isCard ? 0 : overlayTop
  const mapRef = useRef<MapRef>(null)
  const cameraRef = useRef<CameraRef>(null)

  const fixed = record !== undefined && hasGpsFix(record)
  const latitude = fixed ? record.latitude : undefined
  const longitude = fixed ? record.longitude : undefined
  const heading = record ? headingDeg(record.course_deg, record.speed_kmh) : null

  // The basemap is the hub's own (`/maps/` beside the dashboard), behind the same login.
  const origin = connection?.target.kind === 'hub' ? connection.target.origin : null
  const cookie = connection?.cookie
  const theme: MapTheme = isDark ? 'dark' : 'light'
  // Memoised: built per render, MapLibre would reload the style on every GPS message.
  const style = useMemo(
    () => (origin ? basemapStyle(origin, theme) : emptyStyle(theme)),
    [origin, theme],
  )

  // Where the map opens: the van, else where it last was, else the default. Decided once; the map
  // is a live view, not a navigator, so the van moves on a still map.
  const [opening, setOpening] = useState<LatLon | null>(() =>
    latitude !== undefined && longitude !== undefined ? [latitude, longitude] : null,
  )
  const openedWithFix = useRef(opening !== null)
  useEffect(() => {
    if (openedWithFix.current) return
    let live = true
    void readLastPosition().then((last) => {
      if (live) setOpening((current) => current ?? last ?? DEFAULT_CENTRE)
    })
    return () => {
      live = false
    }
  }, [])

  // Remember the position per ~110 m cell, not per fix: a parked receiver wanders by metres.
  const cell =
    latitude === undefined || longitude === undefined
      ? null
      : `${latitude.toFixed(3)},${longitude.toFixed(3)}`
  useEffect(() => {
    if (cell === null || latitude === undefined || longitude === undefined) return
    rememberPosition([latitude, longitude])
    // The first fix on a map that opened without one brings the map to the van, once.
    if (!openedWithFix.current && opening !== null) {
      openedWithFix.current = true
      cameraRef.current?.easeTo({ center: [longitude, latitude], zoom: ZOOM, duration: 600 })
    }
    // Only the cell and the map being open decide; the exact coordinates jitter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell, opening === null])

  const [failed, setFailed] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const zoomBy = (delta: number) => {
    void mapRef.current
      ?.getZoom()
      .then((zoom) => cameraRef.current?.zoomTo(zoom + delta, { duration: 200 }))
  }

  return (
    <View style={[styles.map, isCard && styles.card]}>
      {opening !== null && (
        <MapCanvas
          mapRef={mapRef}
          cameraRef={cameraRef}
          opening={opening}
          mapStyle={style}
          isCard={isCard}
          onFailed={setFailed}
          latitude={latitude}
          longitude={longitude}
          heading={heading}
          pitch={pitch}
        />
      )}

      {origin === null ? (
        <Glass status style={[styles.topNotice, styles.notice, { top: 12 + topInset }]}>
          <MapIcon size={16} color="#ffffff" />
          <View style={styles.noticeText}>
            <Text style={styles.place}>No offline map on this connection</Text>
            <Text style={styles.detail}>
              The map is served by the hub. Sign in with the hub&apos;s address to see it.
            </Text>
          </View>
        </Glass>
      ) : cookie === undefined || failed ? (
        <Glass status style={[styles.topNotice, styles.notice, { top: 12 + topInset }]}>
          <MapIcon size={16} color="#ffffff" />
          <View style={styles.noticeText}>
            <Text style={styles.place}>Offline map unavailable</Text>
            <Text style={styles.detail}>
              {cookie === undefined
                ? 'Sign out and in again to let the map read it from the hub.'
                : 'The hub has no readable maps/basemap.pmtiles.'}
            </Text>
          </View>
        </Glass>
      ) : null}

      <View style={[styles.topLeft, { top: 12 + topInset }]}>
        <MapButton
          icon={LocateFixed}
          label="Centre on van"
          disabled={latitude === undefined || longitude === undefined}
          onPress={() => {
            if (latitude === undefined || longitude === undefined) return
            cameraRef.current?.easeTo({ center: [longitude, latitude], zoom: ZOOM, duration: 500 })
          }}
        />
        {isCard && onExpand && (
          <MapButton icon={Maximize2} label="Open the map" onPress={onExpand} />
        )}
      </View>
      <View style={[styles.topRight, { top: 12 + topInset }]}>
        <MapButton icon={Plus} label="Zoom in" onPress={() => zoomBy(1)} />
        <MapButton icon={Minus} label="Zoom out" onPress={() => zoomBy(-1)} />
      </View>

      <View style={[styles.bottomRight, { bottom: 10 + bottomInset }]}>
        <MapButton icon={Info} label="Map credits" onPress={() => setCreditsOpen(true)} />
      </View>
      {/* The tiles are ODbL: this credit is a licence condition, so the button stays. */}
      <Dialog isOpen={creditsOpen} onOpenChange={setCreditsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <View className="mb-5 gap-1.5">
              <Dialog.Title>Map credits</Dialog.Title>
              <Dialog.Description>
                © OpenStreetMap contributors, under the Open Database Licence. Tiles by Protomaps.
              </Dialog.Description>
            </View>
            <View className="flex-row flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onPress={() => void Linking.openURL('https://openstreetmap.org/copyright')}
              >
                OpenStreetMap
              </Button>
              <Button
                variant="outline"
                size="sm"
                onPress={() => void Linking.openURL('https://protomaps.com')}
              >
                Protomaps
              </Button>
              <Button size="sm" onPress={() => setCreditsOpen(false)}>
                Close
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      <View style={[styles.bottom, { bottom: 10 + bottomInset }]} pointerEvents="box-none">
        {record && fixed ? (
          <Readout record={record} heading={heading} />
        ) : (
          <GpsNotice satellites={record?.satellites_in_use} />
        )}
      </View>
    </View>
  )
})

/**
 * MapLibre's view and the van on it. Memoised apart from the overlays: each render diffs the
 * native view's props, so it redraws only when the van moves, turns or pitches.
 */
const MapCanvas = memo(function MapCanvas({
  mapRef,
  cameraRef,
  opening,
  mapStyle,
  isCard,
  onFailed,
  latitude,
  longitude,
  heading,
  pitch,
}: {
  mapRef: RefObject<MapRef | null>
  cameraRef: RefObject<CameraRef | null>
  opening: LatLon
  mapStyle: ComponentProps<typeof MapView>['mapStyle']
  isCard: boolean
  onFailed: (failed: boolean) => void
  latitude: number | undefined
  longitude: number | undefined
  heading: number | null
  pitch: number | null
}) {
  return (
    <MapView
      ref={mapRef}
      // A texture, not a surface: it clips to the card's corners and scrolls with the page.
      androidView="texture"
      style={StyleSheet.absoluteFill}
      mapStyle={mapStyle}
      dragPan={!isCard}
      touchZoom={!isCard}
      doubleTapZoom={!isCard}
      touchRotate={false}
      touchPitch={false}
      logo={false}
      compass={false}
      // The native (i) opens an OS alert; `VanMap` draws its own button and dialog instead.
      attribution={false}
      onDidFailLoadingMap={() => onFailed(true)}
      onDidFinishLoadingStyle={() => onFailed(false)}
    >
      <Camera ref={cameraRef} initialViewState={{ center: [opening[1], opening[0]], zoom: ZOOM }} />
      {latitude !== undefined && longitude !== undefined && (
        // Wheels on the ground at the position: bottom-centre.
        <Marker id="van" lngLat={[longitude, latitude]} anchor="bottom">
          <VanArt heading={heading} pitch={pitch} />
        </Marker>
      )}
    </MapView>
  )
})

const styles = StyleSheet.create({
  map: { flex: 1, overflow: 'hidden', backgroundColor: '#262830' },
  card: { flex: 0, height: 320 },
  glass: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  topLeft: { position: 'absolute', top: 12, left: 12, gap: 8 },
  topRight: { position: 'absolute', top: 12, right: 12, gap: 8 },
  // Clear of the buttons either side.
  topNotice: { position: 'absolute', top: 12, left: 68, right: 68 },
  bottomRight: { position: 'absolute', right: 12 },
  bottom: { position: 'absolute', left: 10, right: 10, alignItems: 'flex-start' },
  readout: {
    // Leaves the credits button its corner.
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeText: { flexShrink: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  figures: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  place: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  detail: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  figure: { color: '#ffffff', fontSize: 14 },
  strong: { fontWeight: '600' },
  fix: { borderRadius: radius['2xl'], paddingHorizontal: 8, paddingVertical: 2 },
  fixText: { fontSize: 12, fontWeight: '600' },
})
