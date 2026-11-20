import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { confirm, NativeButton, Segmented } from '@/components/native'
import { tabular } from '@/components/ui'
import { formatYieldAmount } from '@/components/widgets/solar/solarView'
import { chargerWatts } from '@/lib/charging'
import {
  entityCountText,
  instanceCountText,
  unsupportedDrivers,
  type DriverRow,
  type DriverTone,
  type UnsupportedDriver,
  type EntityType,
} from '@/lib/drivers'
import {
  RELAY_ICON_NAMES,
  TANK_ICON_NAMES,
  TEMPERATURE_ICON_NAMES,
  iconKey,
} from '@/lib/entityIcons'
import {
  fixLabel,
  formatSnr,
  gpsSummary,
  groupSatellites,
  signalFraction,
  signalQuality,
  type SignalQuality,
} from '@/lib/gps'
import {
  MODE_LABELS,
  canChangeSettings,
  heaterSensor,
  isReporting,
  operatingMode,
  sensorLocked,
  type HeaterSensor,
} from '@/lib/heater'
import {
  instanceKey,
  instanceLabel,
  ownerName,
  parseInstanceKey,
  type InstanceType,
} from '@/lib/instances'
import { AUTO_PRIMARY_BATTERY, compareInstanceIds, primaryBattery } from '@/lib/primaryBattery'
import { ownGroups } from '@/lib/relayGroups'
import { tankLevelStatus } from '@/lib/tank-alarm'
import { sortTankIds } from '@/lib/tank-display'
import { FLUID_LABELS, STATUS_LABELS } from '@/lib/tank-labels'
import {
  formatTemperature,
  sensorLabel,
  sortedSensorIds,
  temperatureSummary,
  titleCase,
} from '@/lib/temperature'
import { formatDeg, tiltReading } from '@/lib/tilt'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { usePreferences } from '@/preferences/PreferencesProvider'
import { radius, useTheme } from '@/theme'
import {
  isCompleteGps,
  type Battery,
  type ChargeState,
  type Charger,
  type ChargerChargeState,
  type Gps,
  type GpsSatellite,
  type Heater,
  type Solar,
  type TemperatureUnit,
} from '@/types'
import { bmsGroup, type BmsCells } from './drivers/bmsData'
import { amps, chargeStateLabel, measured, volts } from './drivers/instanceReadings'
import {
  Box,
  ChoiceRow,
  DetailList,
  DetailRow,
  Empty,
  Group,
  IconPicker,
  NameField,
  NavRow,
  Note,
  RadioList,
  StatGrid,
  SwitchRow,
  type StatusTone,
} from './kit'
import { openSettings, type SettingsView } from './routes'
import { useSettingsData } from './useSettingsData'

// Settings › Devices: every Driver on the bus and everything it publishes, with the settings the
// bus lets a client change (names, units, icons, relay groups, the heater's switch and sensor, the
// tilt sensor's level, the Primary battery). Ported from the dashboard's `settings/drivers`.

const TONE: Record<DriverTone, StatusTone> = { ok: 'ok', offline: 'offline', unknown: 'unknown' }

/** The entity types whose list has a screen of its own. */
const ENTITY_VIEW: Partial<Record<EntityType, SettingsView>> = {
  tank: 'tanks',
  temperature: 'temperature',
  relay: 'relays',
  heater: 'heater',
  gps: 'gps',
  battery: 'batteries',
  solar: 'solar',
  charger: 'chargers',
}

const fixed = (digits: number) => (n: number) => n.toFixed(digits)
const whole = (n: number) => String(Math.round(n))
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })
const byNumericId = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })

const NOT_SUPPORTED = 'Not supported by this app version'
const NOT_SUPPORTED_CHIP = 'Not supported'

function unsupportedDetail({ kind, types }: UnsupportedDriver): string {
  return kind === 'unsupported'
    ? `Publishes: ${types.join(', ')}. Update the app to use it.`
    : `Some of its data isn't shown: ${types.join(', ')}.`
}

function describeDriver(row: DriverRow): string {
  return row.entityCount === null
    ? row.version
    : `${row.version} · ${entityCountText(row.entityCount)}`
}

/** Opens what a device is: a tank, an instance with a screen of its own, the heater, or its Driver. */
function openDevice(driver: DriverRow, type: string, id: string) {
  if (type === 'tank') return openSettings('tank', id)
  if (type === 'heater') return openSettings('heater')
  const key = instanceKey(type as InstanceType, id)
  if (parseInstanceKey(key) !== undefined) return openSettings('instance', key)
  openSettings('driver', driver.key)
}

const SORT_OPTIONS = [
  { key: 'driver', label: 'By driver' },
  { key: 'entity', label: 'By entity' },
] as const

export function DevicesView() {
  const { drivers, state } = useSettingsData()
  const { devicesSort, update } = usePreferences()
  const { settled } = useRenewvanBus()
  const unsupported = settled ? unsupportedDrivers(state) : []

  if (drivers.length === 0) {
    return <Empty>No drivers connected. Waiting for the renewvan hub.</Empty>
  }

  const labelOf = (type: string, id: string): string => {
    if (type === 'tank') {
      const fluid = state.tanks[id]?.fluid_type
      return fluid ? FLUID_LABELS[fluid] : id
    }
    if (type === 'temperature') return sensorLabel(id, state.temperatures[id] ?? {})
    if (type === 'relay') return state.relays[id]?.name ?? id
    if (type === 'heater') return state.heaters[id]?.name ?? id
    const records: Record<string, Record<string, { name?: string; driver?: string }>> = {
      battery: state.batteries,
      solar: state.solar,
      charger: state.chargers,
      gps: state.gps,
      tilt: state.tilt,
    }
    return instanceLabel(id, records[type]?.[id] ?? {}, drivers)
  }

  const sections = new Map<
    string,
    { label: string; items: { key: string; label: string; driver: DriverRow; open: () => void }[] }
  >()
  for (const driver of drivers) {
    for (const { type, label, ids } of driver.entities) {
      const section = sections.get(type) ?? { label, items: [] }
      for (const id of ids) {
        section.items.push({
          key: `${driver.key}:${id}`,
          label: labelOf(type, id),
          driver,
          open: () => openDevice(driver, type, id),
        })
      }
      sections.set(type, section)
    }
  }
  const entitySections = [...sections.entries()]
    .map(([type, section]) => ({
      type,
      label: section.label,
      items: section.items.sort((a, b) => byName(a.label, b.label)),
    }))
    .sort((a, b) => byName(a.label, b.label))

  return (
    <>
      <Segmented
        label="Sort devices by"
        options={SORT_OPTIONS}
        selected={devicesSort}
        onSelect={(next) => update({ devicesSort: next })}
      />
      {devicesSort === 'driver' ? (
        <Group>
          {drivers.map((row) => (
            <NavRow
              key={row.key}
              label={row.name}
              description={describeDriver(row)}
              badge={unsupported.some((u) => u.key === row.key) ? NOT_SUPPORTED_CHIP : undefined}
              badgeLabel={NOT_SUPPORTED}
              tone={TONE[row.tone]}
              dim={row.dim}
              onPress={() => openSettings('driver', row.key)}
            />
          ))}
        </Group>
      ) : (
        entitySections.map(({ type, label, items }) => (
          <Group key={type} title={label}>
            {items.map((item) => (
              <NavRow
                key={item.key}
                label={item.label}
                description={`Driver: ${item.driver.name}`}
                tone={TONE[item.driver.tone]}
                dim={item.driver.dim}
                onPress={item.open}
              />
            ))}
          </Group>
        ))
      )}
    </>
  )
}

export function DriverView({ id }: { id: string }) {
  const { drivers, state, settled } = useSettingsData()
  const unsupported = settled ? unsupportedDrivers(state).find((u) => u.key === id) : undefined
  const row = drivers.find((driver) => driver.key === id)
  if (row === undefined) return <Empty>This driver is no longer on the bus.</Empty>

  const describe = (type: EntityType, ids: string[]): string => {
    if (type === 'temperature') return temperatureSummary(state.temperatures)
    if (type === 'gps') return gpsSummary(Object.values(state.gps).find(isCompleteGps))
    if (type === 'heater') {
      const sensors = ids.flatMap((heaterId) => {
        const sensor = state.heaters[heaterId] && heaterSensor(state.heaters[heaterId])
        return sensor === undefined ? [] : [MODE_LABELS[sensor]]
      })
      return sensors.length === 0 ? entityCountText(ids.length) : sensors.join(', ')
    }
    if (type === 'battery' || type === 'solar' || type === 'charger') {
      return instanceCountText(type, ids.length)
    }
    if (type === 'tank') return ids.length === 1 ? '1 tank' : `${ids.length} tanks`
    return entityCountText(ids.length)
  }

  return (
    <View style={{ gap: 16, opacity: row.dim ? 0.6 : 1 }}>
      <DetailList>
        <DetailRow label="Status" value={row.status} tone={TONE[row.tone]} />
        <DetailRow
          label="Driver"
          value={row.info?.product ?? row.name}
          onPress={() => openSettings('driver-info', row.key)}
        />
      </DetailList>
      {unsupported && (
        <Note>
          {NOT_SUPPORTED}. {unsupportedDetail(unsupported)}
        </Note>
      )}
      {row.entities.length > 0 && (
        <Group title="Publishes">
          {row.entities.map(({ type, label, ids }) => {
            const view = ENTITY_VIEW[type]
            return view !== undefined ? (
              <NavRow
                key={type}
                label={label}
                description={describe(type, ids)}
                onPress={() => openSettings(view)}
              />
            ) : (
              <NavRow
                key={type}
                label={label}
                description={describe(type, ids)}
                onPress={() => openDevice(row, type, ids[0])}
              />
            )
          })}
        </Group>
      )}
    </View>
  )
}

export function DriverInfoView({ id }: { id: string }) {
  const { drivers } = useSettingsData()
  const row = drivers.find((driver) => driver.key === id)
  if (row === undefined) return <Empty>This driver is no longer on the bus.</Empty>
  const { info } = row
  return (
    <>
      <DetailList>
        <DetailRow label="Product" value={info?.product ?? null} />
        <DetailRow label="Source" value={info?.source ?? null} />
        <DetailRow label="Firmware version" value={row.version} />
        <DetailRow label="Board serial" value={info?.board_serial ?? null} />
        {info?.ip !== undefined && <DetailRow label="IP address" value={info.ip} />}
        <DetailRow
          label="Manufacturer"
          value={info === undefined ? null : (info.manufacturer ?? 'renewvan')}
        />
        <DetailRow label="Homepage" value={info?.homepage ?? null} />
      </DetailList>
      {info === undefined && (
        <Note>This driver publishes no info. Update it to see its product and version here.</Note>
      )}
    </>
  )
}

// Tanks

export function TanksView() {
  const { state } = useSettingsData()
  const ids = sortTankIds(Object.keys(state.tanks))
  if (ids.length === 0) return <Empty>No tanks found.</Empty>
  return (
    <Group>
      {ids.map((id) => {
        const tank = state.tanks[id]
        const figures = [
          tank.level_pct === undefined ? undefined : `${tank.level_pct.toFixed(0)}%`,
          tank.capacity_l === undefined ? undefined : `${tank.capacity_l.toFixed(0)} ℓ`,
        ].filter(Boolean)
        return (
          <NavRow
            key={id}
            label={tank.fluid_type ? FLUID_LABELS[tank.fluid_type] : id}
            description={figures.join(' · ') || 'No reading yet'}
            onPress={() => openSettings('tank', id)}
          />
        )
      })}
    </Group>
  )
}

export function TankView({ id }: { id: string }) {
  const { state, entityIcons, commands, demoMode } = useSettingsData()
  const tank = state.tanks[id]
  if (tank === undefined) return <Empty>This tank is no longer on the bus.</Empty>
  const level = tank.level_pct
  const alarm =
    tank.alarm_threshold_pct === undefined
      ? null
      : `${tank.alarm_direction === 'high' ? 'Above' : 'Below'} ${tank.alarm_threshold_pct}%`
  const status =
    tank.status === undefined
      ? null
      : tank.status !== 'ok'
        ? STATUS_LABELS[tank.status]
        : level !== undefined && tank.fluid_type !== undefined && tank.capacity_l !== undefined
          ? (tankLevelStatus(tank, level)?.label ?? 'Normal')
          : STATUS_LABELS.ok
  return (
    <>
      <DetailList heading="Readings">
        <DetailRow label="Level" value={measured(level, (n) => `${n.toFixed(0)}%`)} />
        <DetailRow label="Capacity" value={measured(tank.capacity_l, (n) => `${n.toFixed(0)} ℓ`)} />
        <DetailRow label="Status" value={status} />
        <DetailRow
          label="Temperature"
          value={measured(tank.temperature_c, (n) => `${n.toFixed(0)} °C`)}
        />
        <DetailRow label="Alarm" value={alarm} />
        <DetailRow
          label="Alarm clears"
          value={measured(tank.alarm_restore_pct, (n) => `At ${n}%`)}
        />
      </DetailList>
      <Group title="Icon">
        <Box padded>
          <IconPicker
            names={TANK_ICON_NAMES}
            value={entityIcons[iconKey('tank', id)]}
            disabled={demoMode || tank.fluid_type === undefined}
            onChange={(next) => commands.setEntityIcon('tank', id, next)}
          />
        </Box>
      </Group>
      <Note>
        Capacity, calibration and alarm levels are set in the tank driver&apos;s own configuration
        on the hub. They cannot be changed over the bus yet.
      </Note>
    </>
  )
}

// Temperature, GPS and relay lists

export function TemperatureListView() {
  const { state } = useSettingsData()
  const ids = sortedSensorIds(state.temperatures)
  if (ids.length === 0) {
    return <Empty>No temperature sensors found. Waiting for driver-temperature to publish.</Empty>
  }
  return (
    <Group>
      {ids.map((id) => (
        <NavRow
          key={id}
          label={sensorLabel(id, state.temperatures[id])}
          description={formatTemperature(state.temperatures[id], { suffix: true })}
          onPress={() => openSettings('instance', instanceKey('temperature', id))}
        />
      ))}
    </Group>
  )
}

export function GpsListView() {
  const { state, drivers } = useSettingsData()
  const ids = Object.keys(state.gps)
    .filter((id) => isCompleteGps(state.gps[id]))
    .sort(compareInstanceIds)
  if (ids.length === 0) return <Empty>No GPS data yet. Waiting for driver-gps to publish.</Empty>
  return (
    <Group>
      {ids.map((id) => (
        <NavRow
          key={id}
          label={instanceLabel(id, state.gps[id], drivers)}
          description={gpsSummary(state.gps[id])}
          onPress={() => openSettings('instance', instanceKey('gps', id))}
        />
      ))}
    </Group>
  )
}

export function RelaysListView() {
  const { state } = useSettingsData()
  const ids = Object.keys(state.relays).sort(byNumericId)
  if (ids.length === 0) {
    return <Empty>No relays found. Waiting for the relay driver to publish.</Empty>
  }
  return (
    <Group>
      {ids.map((id) => {
        const relay = state.relays[id]
        const switched = relay.state === undefined ? undefined : relay.state ? 'On' : 'Off'
        return (
          <NavRow
            key={id}
            label={relay.name || id}
            description={[relay.name ? id : undefined, switched].filter(Boolean).join(' · ')}
            onPress={() => openSettings('instance', instanceKey('relay', id))}
          />
        )
      })}
    </Group>
  )
}

// Heater

/** Why the heater's sensor cannot be changed right now, or nothing when it can. */
function lockReason(heater: Heater): string | undefined {
  if (heater.commands_enabled !== true) return 'Read-only! - Commands are turned off.'
  if (!canChangeSettings(heater)) return 'The heater is not ready for a change right now.'
  if (sensorLocked(operatingMode(heater))) {
    return 'The heater does not accept a sensor change in this mode. Switch to Levels › Temperature first.'
  }
  return undefined
}

function fmt(value: number | undefined, digits: number, unit: string): string | null {
  return value === undefined ? null : `${value.toFixed(digits)} ${unit}`
}

export function HeaterView() {
  const { state, commands, demoMode } = useSettingsData()
  const ids = Object.keys(state.heaters).sort()
  if (ids.length === 0) return <Empty>No heater found.</Empty>

  return (
    <>
      {ids.map((id) => {
        const heater = state.heaters[id]
        const label = heater.name ?? id
        const enabled = heater.commands_enabled === true
        const inUse = heaterSensor(heater)
        const probeFitted =
          heater.external_temperature_c !== undefined || inUse === 'external_temperature'
        const reason = lockReason(heater)
        const reporting = isReporting(heater)
        const reading = (text: string | null) => (reporting ? text : null)

        // The Driver's own switch decides who may run a flame, so it is always asked about.
        const confirmCommands = (target: boolean) =>
          confirm({
            title: target ? `Enable controls for ${label}?` : `Disable controls for ${label}?`,
            message: target
              ? 'Anyone who can reach the van’s broker will be able to start and stop the heater. Make sure someone is with the van.'
              : 'The heater keeps doing what it is doing, but it can no longer be started, stopped or adjusted from the dashboard or this app.',
            action: target ? 'Enable' : 'Disable',
            onConfirm: () => commands.setHeaterCommandsEnabled(id, target),
          })

        return (
          <Group key={id} title={label}>
            <Box>
              <SwitchRow
                label="Heater controls"
                description={
                  demoMode
                    ? 'Demo mode is read-only.'
                    : 'Allow the dashboard and this app to control the heater.'
                }
                value={enabled}
                disabled={demoMode}
                onChange={confirmCommands}
              />
            </Box>
            <RadioList<HeaterSensor>
              label="Temperature sensor"
              value={inUse ?? 'heater_temperature'}
              disabled={demoMode || reason !== undefined}
              onChange={(next) => commands.setHeaterMode(id, next)}
              options={[
                { value: 'heater_temperature', label: MODE_LABELS.heater_temperature },
                {
                  value: 'external_temperature',
                  label: MODE_LABELS.external_temperature,
                  description: probeFitted ? undefined : 'No probe fitted',
                  disabled: !probeFitted,
                },
              ]}
            />
            <Note>
              {reason ??
                'The sensor a temperature mode reads. The external probe is available once one is fitted.'}
            </Note>
            <DetailList>
              <DetailRow
                label="External"
                value={reading(fmt(heater.external_temperature_c, 1, '°C'))}
              />
              <DetailRow
                label="Internal"
                value={reading(fmt(heater.internal_temperature_c, 1, '°C'))}
              />
              <DetailRow
                label="Heater"
                value={reading(fmt(heater.heater_temperature_c, 0, '°C'))}
              />
              <DetailRow label="Voltage" value={reading(fmt(heater.voltage_v, 1, 'V'))} />
              <DetailRow label="Fan" value={reading(fmt(heater.fan_rpm, 0, 'rpm'))} />
              <DetailRow label="Fuel pump" value={reading(fmt(heater.fuel_pump_hz, 1, 'Hz'))} />
            </DetailList>
          </Group>
        )
      })}
    </>
  )
}

// Batteries, solar chargers, chargers

type ListedType = 'battery' | 'solar' | 'charger'

/**
 * A battery, solar charger or charger record read through one shape: the three share most of their
 * fields, and each `charge_state` is a subset of the battery's.
 */
type PowerRecord = Partial<
  Omit<Battery, 'charge_state'> & Omit<Solar, 'charge_state'> & Omit<Charger, 'charge_state'>
> & { charge_state?: ChargeState | ChargerChargeState }

/** `bulk` as `Bulk`, `external_control` as `External control`. */
function stateLabel(state: PowerRecord['charge_state']): string | null {
  return state === undefined ? null : chargeStateLabel(state as ChargerChargeState)
}

const EMPTY_TEXT: Record<ListedType, string> = {
  battery: 'No batteries found. Waiting for a Driver to publish.',
  solar: 'No solar controllers found. Waiting for a Driver to publish.',
  charger: 'No chargers found. Waiting for a Driver to publish.',
}

const figure = (value: number | undefined, digits: number, unit: string): string[] =>
  value === undefined ? [] : [`${value.toFixed(digits)} ${unit}`]

function summaryOf(type: ListedType, record: PowerRecord): string[] {
  if (type === 'battery') {
    return [
      ...figure(record.soc_pct, 0, '%'),
      ...figure(record.voltage_v, 2, 'V'),
      ...figure(record.current_a, 1, 'A'),
    ]
  }
  if (type === 'solar') return figure(record.power_w, 0, 'W')
  return [
    ...figure(record.voltage_v, 2, 'V'),
    ...figure(record.current_a, 1, 'A'),
    ...(record.voltage_v === undefined ? [] : figure(chargerWatts(record as Charger), 0, 'W')),
  ]
}

export function InstancesView({ type }: { type: ListedType }) {
  const { state, drivers, primaryBatterySelection } = useSettingsData()
  const records: Record<string, PowerRecord> =
    type === 'battery' ? state.batteries : type === 'solar' ? state.solar : state.chargers
  const ids = Object.keys(records).sort(compareInstanceIds)
  if (ids.length === 0) return <Empty>{EMPTY_TEXT[type]}</Empty>

  const chosen = ids.find((id) => id === primaryBatterySelection)
  const primaryLabel =
    primaryBatterySelection === AUTO_PRIMARY_BATTERY
      ? 'Auto'
      : chosen === undefined
        ? primaryBatterySelection
        : instanceLabel(chosen, records[chosen], drivers)

  return (
    <>
      {type === 'battery' && ids.length > 1 && (
        <NavRow
          label="Primary battery"
          description={primaryLabel}
          onPress={() => openSettings('primary-battery')}
        />
      )}
      <Group>
        {ids.map((id) => (
          <NavRow
            key={id}
            label={instanceLabel(id, records[id], drivers)}
            description={[
              `Driver: ${ownerName(records[id], drivers) ?? '—'}`,
              ...summaryOf(type, records[id]),
            ].join(' · ')}
            onPress={() => openSettings('instance', instanceKey(type, id))}
          />
        ))}
      </Group>
    </>
  )
}

export function PrimaryBatteryView() {
  const { state, drivers, primaryBatterySelection, commands } = useSettingsData()
  const { batteries } = state
  const options = [
    { value: AUTO_PRIMARY_BATTERY, label: 'Auto' },
    ...Object.keys(batteries)
      .sort(compareInstanceIds)
      .map((id) => ({ value: id, label: instanceLabel(id, batteries[id], drivers) })),
  ]
  const labelOf = (id: string) => options.find((option) => option.value === id)?.label ?? id
  const current = primaryBattery(batteries, primaryBatterySelection)
  return (
    <>
      <RadioList
        label="Primary battery"
        options={options}
        value={primaryBatterySelection}
        onChange={commands.setPrimaryBattery}
      />
      {current !== undefined && (
        <Note>
          {current.mode === 'fallback'
            ? `${primaryBatterySelection} is not available, using ${labelOf(current.id)}`
            : `Reading from ${labelOf(current.id)}`}
        </Note>
      )}
      <Note>
        The battery Energy, Home and the dashboard read. It is one choice shared by every screen of
        this van.
      </Note>
    </>
  )
}

// One instance

type Stat = [label: string, value: string | null, unit: string]

function statsOf(
  type: ListedType,
  record: PowerRecord,
): { stats: Stat[]; rows: [label: string, value: string | null][] } {
  if (type === 'solar') {
    const today =
      record.yield_today_wh === undefined ? undefined : formatYieldAmount(record.yield_today_wh)
    return {
      stats: [
        ['State', stateLabel(record.charge_state), ''],
        ['Yield today', today?.value ?? null, today?.unit ?? 'kWh'],
        ['Voltage', measured(record.pv_voltage_v, fixed(2)), 'V'],
        ['Current', measured(record.pv_current_a, fixed(1)), 'A'],
        ['PV power', measured(record.power_w, whole), 'W'],
      ],
      rows: [
        [
          'Battery',
          record.battery_voltage_v === undefined
            ? null
            : `${volts(record.battery_voltage_v)} · ${record.battery_current_a === undefined ? '—' : amps(record.battery_current_a)}`,
        ],
      ],
    }
  }
  if (type === 'charger') {
    return {
      stats: [
        ['State', stateLabel(record.charge_state), ''],
        ['Voltage', measured(record.voltage_v, fixed(2)), 'V'],
        ['Current', measured(record.current_a, fixed(1)), 'A'],
        ['Power', measured(record.power_w, whole), 'W'],
        ['Input', measured(record.input_voltage_v, fixed(2)), 'V'],
      ],
      rows: [['Source', record.source ?? null]],
    }
  }
  return {
    stats: [
      ['Charge', measured(record.soc_pct, whole), '%'],
      ['Voltage', measured(record.voltage_v, fixed(2)), 'V'],
      ['Current', measured(record.current_a, fixed(1)), 'A'],
      ['Power', measured(record.power_w, whole), 'W'],
    ],
    rows: [['Temperature', measured(record.temperature_c, (n) => `${n.toFixed(1)} °C`)]],
  }
}

const BAR_H = 96

/** Per-cell voltages as bars between the pack's lowest and highest, a balancing cell in amber. */
function CellBars({ cells }: { cells: BmsCells }) {
  const { colors } = useTheme()
  const step = cells.bars.length <= 8 ? 1 : cells.bars.length <= 16 ? 2 : 4
  const balancing = cells.bars.some((bar) => bar.balancing)
  const footer = [
    cells.lowest ? `Lowest ${cells.lowest.label} · cell ${cells.lowest.index}` : undefined,
    cells.highest ? `Highest ${cells.highest.label} · cell ${cells.highest.index}` : undefined,
    balancing ? 'Balancing' : undefined,
  ].filter(Boolean)
  return (
    <Group title="Cells">
      <Box padded>
        <View style={styles.axis}>
          <Text style={[styles.axisText, { color: colors.muted }]}>
            {cells.axis.high.toFixed(2)} V
          </Text>
          <Text style={[styles.axisText, { color: colors.muted }]}>
            {cells.axis.low.toFixed(2)} V
          </Text>
        </View>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${cells.bars.length} cells: ${cells.bars
            .map((bar) => `cell ${bar.index} ${bar.label}`)
            .join(', ')}`}
          style={styles.bars}
        >
          {cells.bars.map((bar) => (
            <View key={bar.index} style={styles.bar}>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceSecondary }]}>
                {bar.height !== null && (
                  <View
                    style={{
                      height: Math.max(3, bar.height * BAR_H),
                      borderRadius: radius.lg,
                      backgroundColor: bar.balancing ? colors.warning : colors.accent,
                    }}
                  />
                )}
              </View>
              <Text style={[styles.axisText, { color: colors.muted }]}>
                {(bar.index - 1) % step === 0 ? bar.index : ' '}
              </Text>
            </View>
          ))}
        </View>
        {footer.length > 0 && (
          <Text style={{ color: colors.muted, fontSize: 12 }}>{footer.join(' · ')}</Text>
        )}
      </Box>
    </Group>
  )
}

/** What a BMS reports beyond the four core readings: cells, probes, permissions, protections. */
function BmsDetails({ battery }: { battery: Partial<Battery> }) {
  const group = bmsGroup(battery)
  if (group === undefined) return null
  const permissions = [...group.permissions, ...group.limits]
  return (
    <>
      {group.cells && <CellBars cells={group.cells} />}
      {group.extremes.length > 0 && (
        <DetailList heading="Cell extremes">
          {group.extremes.map(({ label, value }) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
        </DetailList>
      )}
      {group.probes.length > 0 && (
        <DetailList heading="Probes">
          {group.probes.map(({ label, value }) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
        </DetailList>
      )}
      {permissions.length > 0 && (
        <DetailList heading="Permissions and limits">
          {permissions.map(({ label, value, tone }) => (
            <DetailRow
              key={label}
              label={label}
              value={value}
              tone={tone === 'warning' ? 'unknown' : undefined}
            />
          ))}
        </DetailList>
      )}
      {group.protections !== undefined && (
        <DetailList heading="Protections">
          {group.protections.length === 0 ? (
            <DetailRow label="Active" value="None" />
          ) : (
            group.protections.map((name) => (
              <DetailRow key={name} label={name} value="Active" tone="unknown" />
            ))
          )}
        </DetailList>
      )}
    </>
  )
}

function PowerInstance({ type, id }: { type: ListedType; id: string }) {
  const { state, drivers } = useSettingsData()
  const record: PowerRecord | undefined = (
    type === 'solar' ? state.solar : type === 'charger' ? state.chargers : state.batteries
  )[id]
  if (record === undefined) return <Empty>This device is no longer on the bus.</Empty>
  const { stats, rows } = statsOf(type, record)
  const owner = ownerName(record, drivers)
  const linked = record.driver !== undefined && drivers.some((row) => row.key === record.driver)
  return (
    <>
      <StatGrid stats={stats} />
      <DetailList>
        {rows.map(([name, value]) => (
          <DetailRow key={name} label={name} value={value} />
        ))}
        <DetailRow
          label="Driver"
          value={owner ?? record.driver ?? null}
          onPress={linked ? () => openSettings('driver-info', record.driver) : undefined}
        />
      </DetailList>
      {type === 'battery' && <BmsDetails battery={state.batteries[id]} />}
    </>
  )
}

const SIGNAL_TEXT: Record<SignalQuality, string> = {
  none: 'not measured yet',
  poor: 'poor',
  fair: 'fair',
  good: 'good',
  strong: 'strong',
}

function SatelliteBar({ sat }: { sat: GpsSatellite }) {
  const { colors } = useTheme()
  const quality = signalQuality(sat.snr_db)
  const tone =
    quality === 'none'
      ? colors.border
      : quality === 'poor'
        ? colors.danger
        : quality === 'fair'
          ? colors.warning
          : colors.success
  return (
    <View
      accessible
      accessibilityLabel={`Satellite ${sat.prn}, ${formatSnr(sat.snr_db)}, ${SIGNAL_TEXT[quality]}`}
      style={styles.sat}
    >
      <View style={[styles.satTrack, { backgroundColor: colors.surfaceSecondary }]}>
        <View
          style={{
            height: Math.max(2, signalFraction(sat.snr_db) * 64),
            borderRadius: radius.lg,
            backgroundColor: tone,
          }}
        />
      </View>
      <Text style={[styles.axisText, { color: colors.muted }]}>{sat.prn}</Text>
    </View>
  )
}

function GpsInstance({ id }: { id: string }) {
  const { state } = useSettingsData()
  const { colors } = useTheme()
  const record: Gps | undefined = isCompleteGps(state.gps[id] ?? {})
    ? (state.gps[id] as Gps)
    : undefined
  if (record === undefined) return <Empty>No GPS data yet.</Empty>
  const { satellites } = record
  const reading = (value: number | undefined, digits: number, unit?: string) =>
    value === undefined ? null : unit ? `${value.toFixed(digits)} ${unit}` : value.toFixed(digits)
  return (
    <>
      <DetailList>
        <DetailRow label="Fix" value={fixLabel(record.fix_quality)} />
        <DetailRow
          label="Satellites"
          value={
            satellites === undefined
              ? `${record.satellites_in_use} in use`
              : `${record.satellites_in_use} in use, ${satellites.length} in view`
          }
        />
        <DetailRow label="Average signal" value={reading(record.avg_snr_db, 1, 'dB-Hz')} />
        <DetailRow label="HDOP" value={reading(record.hdop, 1)} />
        <DetailRow label="Altitude" value={reading(record.altitude_m, 0, 'm')} />
        <DetailRow label="Speed" value={reading(record.speed_kmh, 0, 'km/h')} />
        <DetailRow
          label="Fix time"
          value={
            record.fix_time === undefined
              ? null
              : `${record.fix_time.slice(0, 10)} ${record.fix_time.slice(11, 19)} UTC`
          }
        />
      </DetailList>
      {satellites !== undefined && (
        <Group title="Satellite signal">
          {satellites.length === 0 ? (
            <Empty>The receiver reports no satellites in view.</Empty>
          ) : (
            <Box padded>
              {groupSatellites(satellites).map((group) => (
                <View key={group.label} style={{ gap: 6 }}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{group.label}</Text>
                  <View style={styles.sats}>
                    {group.satellites.map((sat) => (
                      <SatelliteBar key={sat.prn} sat={sat} />
                    ))}
                  </View>
                </View>
              ))}
            </Box>
          )}
        </Group>
      )}
    </>
  )
}

const UNIT_OPTIONS = [
  { key: 'C', label: '°C' },
  { key: 'F', label: '°F' },
] as const

function TemperatureInstance({ id }: { id: string }) {
  const { state, entityIcons, commands, demoMode } = useSettingsData()
  const { colors } = useTheme()
  const sensor = state.temperatures[id]
  if (sensor === undefined) return <Empty>This sensor is no longer on the bus.</Empty>
  // A sensor with no name or unit yet has not finished arriving: nothing to edit against.
  const ready = sensor.name !== undefined
  return (
    <>
      <Box padded>
        <View style={styles.headline}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{titleCase(id)}</Text>
          <Text style={[styles.headlineValue, { color: colors.foreground }]}>
            {formatTemperature(sensor, { suffix: true })}
          </Text>
        </View>
        <NameField
          name={sensor.name}
          disabled={demoMode || !ready}
          onCommit={(name) => commands.setTemperatureName(id, name)}
        />
      </Box>
      <Box padded>
        <ChoiceRow<TemperatureUnit>
          label="Show in"
          options={UNIT_OPTIONS}
          value={sensor.unit}
          disabled={demoMode || sensor.unit === undefined}
          onChange={(unit) => commands.setTemperatureUnit(id, unit)}
        />
      </Box>
      <Group title="Icon">
        <Box padded>
          <IconPicker
            names={TEMPERATURE_ICON_NAMES}
            value={entityIcons[iconKey('temperature', id)]}
            disabled={demoMode || !ready}
            onChange={(next) => commands.setEntityIcon('temperature', id, next)}
          />
        </Box>
      </Group>
      <Note>
        The name, unit and icon are the sensor&apos;s own: every screen of this van shows them.
      </Note>
    </>
  )
}

/** The hub's limit on a relay name (`relay.schema.json`). */
const RELAY_NAME_MAX_BYTES = 63
const NO_GROUP = ' none'

function RelayInstance({ id }: { id: string }) {
  const { state, relayGroups, groupList, entityIcons, commands, demoMode } = useSettingsData()
  const { colors } = useTheme()
  const relay = state.relays[id]
  if (relay === undefined) return <Empty>This relay is no longer on the bus.</Empty>
  const offered = ownGroups(groupList)
  const group = relayGroups[id]
  const current = group !== undefined && offered.includes(group) ? group : NO_GROUP
  return (
    <>
      <Box padded>
        <View style={styles.headline}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{id}</Text>
          <Text style={[styles.headlineValue, { color: colors.foreground }]}>
            {relay.state === undefined ? 'Unknown' : relay.state ? 'On' : 'Off'}
          </Text>
        </View>
        <NameField
          name={relay.name}
          maxBytes={RELAY_NAME_MAX_BYTES}
          disabled={demoMode}
          onCommit={(next) => commands.setRelayName(id, next)}
        />
      </Box>
      <Group title="Icon">
        <Box padded>
          <IconPicker
            names={RELAY_ICON_NAMES}
            value={entityIcons[iconKey('relay', id)]}
            disabled={demoMode}
            onChange={(next) => commands.setEntityIcon('relay', id, next)}
          />
        </Box>
      </Group>
      <Group
        title="Group"
        note="Which panel of the Controls tab this relay sits in. Add or rename groups under Settings › Controls."
      >
        <RadioList
          label="Group"
          value={current}
          disabled={demoMode}
          onChange={(next) => commands.setRelayGroup(id, next === NO_GROUP ? null : next)}
          options={[
            { value: NO_GROUP, label: 'None' },
            ...offered.map((name) => ({ value: name, label: name })),
          ]}
        />
      </Group>
    </>
  )
}

function TiltInstance({ id }: { id: string }) {
  const { state, drivers, commands, demoMode } = useSettingsData()
  const record = state.tilt[id]
  if (record === undefined) return <Empty>This sensor is no longer on the bus.</Empty>
  const { roll, pitch } = tiltReading(record)
  const live = roll !== null
  const askSetLevel = () =>
    confirm({
      title: 'Set level?',
      message:
        'The van must be parked on level ground. Roll and pitch will read 0° from now on, from where it sits.',
      action: 'Set level',
      onConfirm: () => commands.setTiltLevel(id),
    })
  return (
    <>
      <DetailList>
        <DetailRow label="Roll" value={formatDeg(roll)} />
        <DetailRow label="Pitch" value={formatDeg(pitch)} />
        <DetailRow label="Driver" value={ownerName(record, drivers) ?? null} />
      </DetailList>
      <Group title="Calibration">
        <Box padded>
          <Note>
            Park the van on level ground, then set level to make the current roll and pitch read 0°.
          </Note>
          <NativeButton label="Set level" disabled={demoMode || !live} onPress={askSetLevel} />
          <NativeButton
            label="Reset"
            variant="outlined"
            disabled={demoMode}
            onPress={() => commands.resetTiltLevel(id)}
          />
        </Box>
        {!live && <Note>The sensor is not reporting; it cannot be set yet.</Note>}
      </Group>
    </>
  )
}

/** One instance's screen, by what it is. `id` is an instance key, `<type>:<id>`. */
export function InstanceView({ id }: { id: string }) {
  const instance = parseInstanceKey(id)
  if (instance === undefined) return <Empty>This device is no longer on the bus.</Empty>
  switch (instance.type) {
    case 'gps':
      return <GpsInstance id={instance.id} />
    case 'temperature':
      return <TemperatureInstance id={instance.id} />
    case 'relay':
      return <RelayInstance id={instance.id} />
    case 'tilt':
      return <TiltInstance id={instance.id} />
    default:
      return <PowerInstance type={instance.type} id={instance.id} />
  }
}

/** Leaves a screen whose subject has gone (a group that was removed). */
export function leaveScreen() {
  if (router.canGoBack()) router.back()
}

const styles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisText: { fontSize: 10, ...tabular },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bar: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: {
    height: BAR_H,
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    justifyContent: 'flex-end',
  },
  sats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sat: { width: 22, alignItems: 'center', gap: 4 },
  satTrack: { height: 64, width: 14, borderRadius: radius.lg, justifyContent: 'flex-end' },
  headline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  headlineValue: { fontSize: 16, fontWeight: '600', ...tabular },
})
