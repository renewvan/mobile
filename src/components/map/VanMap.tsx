import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapView,
  Marker,
  type CameraRef,
  type CircleLayerStyle,
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
import { usePreferences } from '@/preferences/PreferencesProvider'
import { useSession } from '@/session/SessionProvider'
import { radius, useTheme } from '@/theme'
import { isCompleteGps, type Gps } from '@/types'
import { usePosition, type PositionState } from '@/location/usePosition'
import type { PositionSource } from '@/location/position'

// The van on a map, as the dashboard's Map page draws it (dashboard `components/map/MapPage.tsx`):
// a native MapLibre map of the same Protomaps style, read from the same offline `basemap.pmtiles`
// the hub serves, with the van drawn at the hub's GPS fix and a fix / satellites / speed / heading
// readout over its corner. Nothing falls back to an online map: outside the file's area, or
// without the file, the map is the style's empty ground with the van on it.

type LatLon = [latitude: number, longitude: number]

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
 * The van on the map: the filled side view, in the owner's colour or else the accent. It mirrors to face the way it is
 * heading and pitches with the tilt sensor, pivoting on its wheels as the tilt widget does.
 */
const VanArt = memo(function VanArt({
  heading,
  pitch,
  color,
}: {
  heading: number | null
  pitch: number | null
  /** `#rrggbb`; the theme accent when empty. */
  color: string
}) {
  const { colors } = useTheme()
  const fill = color || colors.accent
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
          <Path d={VAN_BODY_PATH} fill={fill} />
          <Path d={VAN_BUMPER_PATH} fill={fill} />
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

/** With neither source, explain the fallback and put its permission flow at the point of need. */
function PositionNotice({
  status,
  requestPermission,
}: Pick<PositionState, 'status' | 'requestPermission'>) {
  const blocked = status?.status === 'denied' && !status.canAskAgain
  const canRequest =
    status !== null &&
    (status.status === 'undetermined' || (status.status === 'denied' && status.canAskAgain))
  return (
    <Glass style={[styles.readout, styles.notice]}>
      <MapPin size={16} color="#ef4444" />
      <View style={styles.noticeText}>
        <Text style={styles.place}>
          No position. This van has no GPS, and this phone&apos;s location is off.
        </Text>
        {blocked && <Text style={styles.detail}>Location is off for this app</Text>}
        {blocked ? (
          <Button size="sm" onPress={() => void Linking.openSettings()}>
            Open settings
          </Button>
        ) : canRequest ? (
          <Button size="sm" onPress={() => void requestPermission().catch(() => {})}>
            Use this phone&apos;s location
          </Button>
        ) : null}
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
  const { van } = usePreferences()
  const position = usePosition()
  return (
    <VanMapView
      {...props}
      {...position}
      record={id ? state.gps[id] : undefined}
      pitch={shownPitch}
      vanColor={van.color}
    />
  )
}

const VanMapView = memo(function VanMapView({
  variant,
  onExpand,
  record,
  pitch,
  vanColor,
  position,
  source,
  status,
  requestPermission,
}: VanMapProps &
  PositionState & { record: Gps | undefined; pitch: number | null; vanColor: string }) {
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

  const latitude = position?.latitude
  const longitude = position?.longitude
  const heading =
    source === 'van' && record ? headingDeg(record.course_deg, record.speed_kmh) : null

  // The basemap is the hub's own (`/maps/` beside the dashboard), behind the same login.
  const origin = connection?.target.kind === 'hub' ? connection.target.origin : null
  const cookie = connection?.cookie
  const theme: MapTheme = isDark ? 'dark' : 'light'
  // Memoised: built per render, MapLibre would reload the style on every GPS message.
  const style = useMemo(
    () => (origin ? basemapStyle(origin, theme) : emptyStyle(theme)),
    [origin, theme],
  )

  // Where the map opens: the current source, else the hub default. Decided once; later movement
  // leaves the map still, while the first position to arrive centres it once.
  const [opening] = useState<LatLon>(() =>
    latitude !== undefined && longitude !== undefined ? [latitude, longitude] : DEFAULT_CENTRE,
  )
  const openedWithPosition = useRef(position !== null)
  useEffect(() => {
    if (openedWithPosition.current || latitude === undefined || longitude === undefined) return
    openedWithPosition.current = true
    cameraRef.current?.easeTo({ center: [longitude, latitude], zoom: ZOOM, duration: 600 })
  }, [latitude, longitude])

  const [failed, setFailed] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const zoomBy = (delta: number) => {
    void mapRef.current
      ?.getZoom()
      .then((zoom) => cameraRef.current?.zoomTo(zoom + delta, { duration: 200 }))
  }

  return (
    <View style={[styles.map, isCard && styles.card]}>
      <MapCanvas
        mapRef={mapRef}
        cameraRef={cameraRef}
        opening={opening}
        mapStyle={style}
        isCard={isCard}
        onFailed={setFailed}
        latitude={latitude}
        longitude={longitude}
        accuracy={position?.accuracy ?? null}
        source={source}
        heading={heading}
        pitch={pitch}
        vanColor={vanColor}
      />

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
          label={source === 'phone' ? 'Centre on your phone' : 'Centre on van'}
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
        {record && source === 'van' ? (
          <Readout record={record} heading={heading} />
        ) : source === 'none' ? (
          <PositionNotice status={status} requestPermission={requestPermission} />
        ) : null}
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
  accuracy,
  source,
  heading,
  pitch,
  vanColor,
}: {
  mapRef: RefObject<MapRef | null>
  cameraRef: RefObject<CameraRef | null>
  opening: LatLon
  mapStyle: ComponentProps<typeof MapView>['mapStyle']
  isCard: boolean
  onFailed: (failed: boolean) => void
  latitude: number | undefined
  longitude: number | undefined
  accuracy: number | null
  source: PositionSource
  heading: number | null
  pitch: number | null
  vanColor: string
}) {
  const accuracyStyle: CircleLayerStyle = {
    // MapLibre circles are screen pixels: this zoom expression keeps the radius in metres.
    circleRadius:
      accuracy === null || latitude === undefined
        ? 0
        : [
            '/',
            accuracy,
            ['/', 156543.03392 * Math.cos((latitude * Math.PI) / 180), ['^', 2, ['zoom']]],
          ],
    circleColor: '#0485f7',
    circleOpacity: 0.15,
    circleStrokeColor: '#0485f7',
    circleStrokeOpacity: 0.6,
    circleStrokeWidth: 1,
  }
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
      {source === 'van' && latitude !== undefined && longitude !== undefined && (
        // Wheels on the ground at the position: bottom-centre.
        <Marker id="van" lngLat={[longitude, latitude]} anchor="bottom">
          <VanArt heading={heading} pitch={pitch} color={vanColor} />
        </Marker>
      )}
      {source === 'phone' && latitude !== undefined && longitude !== undefined && (
        <>
          {accuracy !== null && (
            <GeoJSONSource
              id="phone-accuracy"
              data={{
                type: 'Feature',
                properties: {},
                geometry: { type: 'Point', coordinates: [longitude, latitude] },
              }}
            >
              <Layer id="phone-accuracy-ring" type="circle" style={accuracyStyle} />
            </GeoJSONSource>
          )}
          <Marker id="phone" lngLat={[longitude, latitude]} anchor="top">
            <View style={styles.phoneMarker}>
              <View style={styles.phoneDot} />
              <Text style={styles.phoneLabel}>Your phone</Text>
            </View>
          </Marker>
        </>
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
  // The annotation's top is the dot's top: lift it by its radius to centre the dot on the fix.
  phoneMarker: { alignItems: 'center', transform: [{ translateY: -8 }] },
  phoneDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0485f7',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  phoneLabel: {
    marginTop: 4,
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
})
