import {
  Fan,
  Flame,
  Heater as HeaterIcon,
  Info,
  SunSnow,
  ThermometerSnowflake,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Commands } from '@/bus/commands'
import { NativeButton, NativeSwitch } from '@/components/native'
import { Card, CardHeader, tabular } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import {
  OPERATING_MODES,
  POWER_RANGE,
  SETPOINT_RANGE,
  canChangeSettings,
  canStart,
  canStop,
  formatClock,
  hasError,
  heaterSensor,
  isReporting,
  modeSwitchBlock,
  operatingMode,
  phaseLabel,
  startSummary,
  statusLine,
  type HeaterSensor,
  type OperatingMode,
} from '@/lib/heater'
import { alpha, radius, useTheme } from '@/theme'
import type { Heater } from '@/types'
import { DialSlider } from './DialSlider'
import { useHeaterCommands, type Field } from './useHeaterCommands'

const OPERATING_MODE_ICONS: Record<OperatingMode, LucideIcon> = {
  power: Flame,
  temperature: ThermometerSnowflake,
  ventilation: Fan,
  thermostat: SunSnow,
}

export interface HeaterCardProps {
  id: string
  heater: Heater
  /** Demo mode, or the heater's Driver is not online: everything reads Unknown and nothing is sent. */
  frozen: boolean
  commands: Commands
  /** The second card, with the sensor readings and the runtime. The Start tab leaves it out. */
  showReadings?: boolean
}

function fmt(value: number | undefined, digits: number, unit: string): string {
  return value === undefined ? '—' : `${value.toFixed(digits)} ${unit}`
}

/**
 * How long the heater has been on: it counts every second from the heater's own `runtime_s`
 * whenever that arrives, from zero when it leaves Off, and reads 0:00 while it is off.
 */
function useRunTime(heater: Heater): number {
  const on = heater.phase !== undefined && heater.phase !== 'off'
  const runtime = heater.runtime_s
  const now = useNow(1000).getTime()
  const [seen, setSeen] = useState({ on, runtime })
  const [sync, setSync] = useState({ base: runtime ?? 0, at: now })
  if (seen.on !== on || seen.runtime !== runtime) {
    setSeen({ on, runtime })
    if (!on || !seen.on) setSync({ base: 0, at: now })
    else if (runtime !== undefined) setSync({ base: runtime, at: now })
  }
  return on ? sync.base + Math.max(0, now - sync.at) / 1000 : 0
}

function Readings({ heater, reporting }: { heater: Heater; reporting: boolean }) {
  const { colors } = useTheme()
  const seconds = useRunTime(heater)
  const show = (text: string) => (reporting ? text : '—')
  const rows: [label: string, value: string][] = [
    ['External', show(fmt(heater.external_temperature_c, 1, '°C'))],
    ['Internal', show(fmt(heater.internal_temperature_c, 1, '°C'))],
    ['Heater', show(fmt(heater.heater_temperature_c, 0, '°C'))],
    ['Voltage', show(fmt(heater.voltage_v, 1, 'V'))],
    ['Fan', show(fmt(heater.fan_rpm, 0, 'rpm'))],
    ['Fuel pump', show(fmt(heater.fuel_pump_hz, 1, 'Hz'))],
    ['Runtime', show(formatClock(seconds))],
  ]
  return (
    <View style={styles.readings}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.reading}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
          <Text style={[styles.readingValue, { color: colors.foreground }]}>{value}</Text>
        </View>
      ))}
    </View>
  )
}

/**
 * One heater: the dial that sets what it should do, the operating modes and Start/Stop, then what
 * it is doing. The dial drives the target temperature, or the power level in the fixed-power and
 * ventilation modes.
 *
 * The card claims no more than the bus does: a command shows pending until the retained field
 * changes, a heater whose Driver is down or whose live fields are cleared reads Unknown rather
 * than off, and controls need the Driver's own `commands_enabled` (hub ADR 0021).
 */
export function HeaterCard({ id, heater, frozen, commands, showReadings = true }: HeaterCardProps) {
  const { colors } = useTheme()
  const label = heater.name ?? id
  const reporting = !frozen && isReporting(heater)
  const { send, stateOf } = useHeaterCommands(heater, frozen || !reporting)
  const afterStop = useRef<OperatingMode | null>(null)

  const commandsOn = heater.commands_enabled === true
  const controls = reporting && commandsOn
  const settingsOk = controls && canChangeSettings(heater)
  const run = stateOf('run')
  const mode = stateOf('mode')
  // Ventilation is chosen first and started by Start: the hub has no `mode` for it, so the choice
  // is held here until then (it only stands while the heater is off).
  const [ventilationChosen, setVentilationChosen] = useState(false)
  const armed = ventilationChosen && heater.phase === 'off'
  // Once the heater leaves off the choice is spent, so a later Start never runs the fan on a
  // choice made before that run.
  const [phaseSeen, setPhaseSeen] = useState(heater.phase)
  if (phaseSeen !== heater.phase) {
    setPhaseSeen(heater.phase)
    if (heater.phase !== 'off') setVentilationChosen(false)
  }
  const current = armed ? 'ventilation' : operatingMode(heater)
  // The sensor a switch back to Temperature resumes: the one in use, else the last one seen.
  const [lastSensor, setLastSensor] = useState<HeaterSensor>('heater_temperature')
  const inUse = heaterSensor(heater)
  if (inUse !== undefined && inUse !== lastSensor) setLastSensor(inUse)
  const sensor = inUse ?? lastSensor
  const modesOk = controls && heater.phase !== 'shutting_down'

  const applyMode = (next: OperatingMode) => {
    setVentilationChosen(next === 'ventilation')
    // The hub's `mode` is Power or a sensor, so Temperature and Thermostat resume the last sensor.
    // Thermostat is that sensor mode with `thermostat` on; leaving it for any mode turns it off.
    const fromPower = heater.mode === 'power' || heater.mode === undefined
    if (next === 'power') {
      send('mode', () => {
        commands.setHeaterMode(id, 'power')
        if (heater.thermostat === true) commands.setHeaterThermostat(id, false)
      })
    }
    if (next === 'temperature' || next === 'thermostat') {
      const on = next === 'thermostat'
      send('mode', () => {
        if (fromPower) commands.setHeaterMode(id, sensor)
        if ((heater.thermostat === true) !== on) commands.setHeaterThermostat(id, on)
      })
    }
    // Ventilation changes no `mode` field: Start sends it.
  }

  // The stop a mode switch asked for went through: now reach the mode it was for.
  const runFailed = run?.failed === true
  useEffect(() => {
    const target = afterStop.current
    if (target === null) return
    if (runFailed) afterStop.current = null
    else if (heater.phase === 'off') {
      afterStop.current = null
      applyMode(target)
    }
    // `applyMode` is rebuilt every render and reads only what the render supplied.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heater.phase, runFailed])

  // Ventilation, like Power, is set by a power level.
  const byPower = current === 'power' || current === 'ventilation'
  const dialField: Field = byPower ? 'power' : 'setpoint'
  const dial = stateOf(dialField)
  const dialBusy = dial !== undefined && !dial.failed
  const dialValue = byPower ? heater.power_level : heater.setpoint_c
  const phase = reporting ? phaseLabel(heater) : undefined
  // Warm while the flame is on or coming up, the theme accent otherwise, and always the accent in
  // Ventilation, where the fan runs and nothing burns.
  const heating =
    reporting &&
    current !== 'ventilation' &&
    (heater.phase === 'starting' || heater.phase === 'warming_up' || heater.phase === 'running')
  const tone = heating ? colors.warning : colors.accent
  const toneFg = heating ? colors.warningForeground : colors.accentForeground
  const cabin = reporting ? heater.internal_temperature_c : undefined

  // One info line above the modes; the reason the controls are off outranks the rest.
  const infoText =
    !reporting && !frozen
      ? 'No recent reading from the heater.'
      : reporting && !commandsOn
        ? 'Read-only! - Commands are turned off.'
        : statusLine(heater, current)

  const confirmStart = () => {
    Alert.alert(
      armed ? `Start ventilation on ${label}?` : `Start ${label}?`,
      startSummary(heater, current),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: armed ? 'Start ventilation' : 'Start',
          onPress: () => {
            if (armed) {
              setVentilationChosen(false)
              send('run', () => commands.setHeaterVentilating(id, true))
            } else send('run', () => commands.setHeaterRunning(id, true))
          },
        },
      ],
    )
  }

  const pickMode = (next: OperatingMode) => {
    if (next === current) return
    // Ventilation and the heating modes exclude each other while the heater runs: offer the stop.
    const block = modeSwitchBlock(heater, current, next)
    if (block === undefined) return applyMode(next)
    const name = OPERATING_MODES.find((m) => m.key === next)?.label
    Alert.alert(`Switch to ${name}?`, `${block} Stop the heater first?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop heater',
        style: 'destructive',
        onPress: () => {
          afterStop.current = next
          send('run', () => commands.setHeaterRunning(id, false))
        },
      },
    ])
  }

  const runBusy = run !== undefined && !run.failed
  const modesDisabled = !modesOk || mode !== undefined

  return (
    <>
      <Card>
        <CardHeader
          icon={<HeaterIcon size={16} color={colors.muted} />}
          title={label}
          right={
            <View style={styles.headerRight}>
              {/* The dial shows the phase; only "Unknown" (not reporting) is worth keeping up here. */}
              {!reporting && (
                <Text style={[styles.unknown, { color: colors.foreground }]}>Unknown</Text>
              )}
              <NativeSwitch
                label={`${label} controls`}
                value={commandsOn}
                // Frozen or not reporting: nothing would answer the change.
                disabled={frozen || !reporting}
                onChange={(on) => commands.setHeaterCommandsEnabled(id, on)}
              />
            </View>
          }
        />
        <View style={styles.content}>
          <DialSlider
            label={byPower ? 'Power' : 'Target'}
            value={dialBusy && dial.to !== undefined ? dial.to : dialValue}
            min={byPower ? POWER_RANGE.min : SETPOINT_RANGE.min}
            max={byPower ? POWER_RANGE.max : SETPOINT_RANGE.max}
            unit={byPower ? '' : '°C'}
            tone={tone}
            status={phase}
            marker={byPower ? undefined : cabin}
            reading={cabin === undefined ? undefined : `${cabin.toFixed(1)} °C`}
            disabled={!settingsOk}
            busy={dialBusy}
            onCommit={(to) =>
              byPower
                ? send('power', () => commands.setHeaterPowerLevel(id, to), to)
                : send('setpoint', () => commands.setHeaterSetpoint(id, to), to)
            }
          />

          {infoText !== undefined && (
            <View style={styles.info}>
              <Info size={14} color={colors.muted} />
              <Text numberOfLines={2} style={[styles.infoText, { color: colors.muted }]}>
                {infoText}
              </Text>
            </View>
          )}

          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={`${label} mode`}
            style={[
              styles.modes,
              { backgroundColor: colors.default, opacity: modesDisabled ? 0.5 : 1 },
            ]}
          >
            {OPERATING_MODES.map(({ key, label: modeLabel }) => {
              const ModeIcon = OPERATING_MODE_ICONS[key]
              const selected = key === current
              const fg = selected ? toneFg : colors.foreground
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityLabel={modeLabel}
                  accessibilityState={{ selected, disabled: modesDisabled }}
                  disabled={modesDisabled}
                  android_ripple={{ color: alpha(tone, 0.2) }}
                  onPress={() => pickMode(key)}
                  style={[styles.mode, selected && { backgroundColor: tone, flexGrow: 2.2 }]}
                >
                  <ModeIcon size={20} color={fg} />
                  {/* The current mode is named; the others are icons to save the width. */}
                  {selected && (
                    <Text numberOfLines={1} style={[styles.modeLabel, { color: fg }]}>
                      {modeLabel}
                    </Text>
                  )}
                </Pressable>
              )
            })}
          </View>

          <View style={styles.startStop}>
            <View style={{ flex: 1 }}>
              {canStop(heater) ? (
                <NativeButton
                  label="Stop"
                  variant="danger"
                  disabled={!controls || runBusy}
                  onPress={() => send('run', () => commands.setHeaterRunning(id, false))}
                />
              ) : (
                <NativeButton
                  label="Start"
                  disabled={!controls || !canStart(heater) || runBusy}
                  onPress={confirmStart}
                />
              )}
            </View>
            {runBusy && <ActivityIndicator size="small" color={colors.accent} />}
          </View>
          {controls && heater.phase === 'off' && hasError(heater) && (
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Can&apos;t start with a fault.
            </Text>
          )}
        </View>
      </Card>

      {showReadings && (
        <Card style={styles.readingsCard}>
          {reporting && hasError(heater) && (
            <View
              accessibilityRole="alert"
              style={[styles.fault, { backgroundColor: alpha(colors.danger, 0.1) }]}
            >
              <TriangleAlert size={16} color={colors.danger} />
              <Text style={{ color: colors.danger, fontSize: 14 }}>
                Heater fault, error {heater.error_code}
              </Text>
            </View>
          )}
          <Readings heater={heater} reporting={reporting} />
        </Card>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unknown: { fontSize: 14, fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 12, flex: 1 },
  modes: { flexDirection: 'row', borderRadius: radius['3xl'], overflow: 'hidden' },
  mode: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  modeLabel: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  startStop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  readingsCard: { padding: 16, gap: 12 },
  fault: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readings: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  reading: { width: '50%', gap: 2 },
  readingValue: { fontSize: 14, fontWeight: '600', ...tabular },
})
