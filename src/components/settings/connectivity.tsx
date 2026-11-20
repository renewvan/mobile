import { useCapabilities } from '@/hooks/useCapabilities'
import { useNow } from '@/hooks/useNow'
import { busStatusText, cellularTier, networkTypeLabel, uplinkHeadline } from '@/lib/connection'
import type { DriverTone } from '@/lib/drivers'
import { formatBytes, formatUptime } from '@/lib/format'
import { classifyHost, hubRouteText } from '@/lib/hubAddress'
import { driverCounts, driverCountsText } from '@/lib/hubDrivers'
import { plmnOperatorName } from '@/lib/plmn'
import { routerDriver, routerName } from '@/lib/routerDriver'
import {
  tailscaleDaemonText,
  tailscaleEndpoints,
  tailscalePeersText,
  tailscaleStatusText,
} from '@/lib/tailscale'
import { useSession } from '@/session/SessionProvider'
import { DetailList, DetailRow, Group, NavRow, type StatusTone } from './kit'
import { openSettings } from './routes'
import { useSettingsData } from './useSettingsData'

// Settings › Connectivity: how the van reaches the internet (the cellular router), how this phone
// reaches the van (the bus link), and Tailscale. Read-only, as on the dashboard.

const DRIVER_TONE: Record<DriverTone, StatusTone> = {
  ok: 'ok',
  offline: 'offline',
  unknown: 'unknown',
}

export function ConnectivityView() {
  const { drivers, router, routerHealth, routerUpdatedAt, status, tailscale } = useSettingsData()
  const hasRouter = useCapabilities().router.state === 'present'
  const now = useNow(30_000).getTime()
  const driver = routerDriver(drivers)
  const tier = cellularTier(router?.signal_rsrp_dbm, routerHealth, routerUpdatedAt, now)
  const installed = driver !== undefined || routerUpdatedAt !== undefined
  return (
    <Group>
      {hasRouter && (
        <NavRow
          label={routerName(driver)}
          description={installed ? uplinkHeadline(router, tier) : 'Not installed'}
          onPress={() => openSettings('cellular')}
        />
      )}
      <NavRow label="Hub" description={busStatusText(status)} onPress={() => openSettings('hub')} />
      <NavRow
        label="Tailscale"
        description={tailscaleStatusText(tailscale)}
        onPress={() => openSettings('tailscale')}
      />
    </Group>
  )
}

export function CellularView() {
  const { router, drivers } = useSettingsData()
  const driver = routerDriver(drivers)
  const dbm = (value: number | undefined, unit: string) =>
    value === undefined ? null : `${value} ${unit}`
  return (
    <>
      {driver && (
        <DetailList heading="Driver">
          <DetailRow label="Product" value={driver.info?.product ?? null} />
          <DetailRow label="Status" value={driver.status} tone={DRIVER_TONE[driver.tone]} />
          <DetailRow label="Firmware" value={driver.version} />
        </DetailList>
      )}
      <DetailList heading="Signal">
        <DetailRow
          label="Operator"
          value={
            router?.operator !== undefined
              ? (plmnOperatorName(router.operator) ?? router.operator)
              : null
          }
        />
        <DetailRow
          label="Network"
          value={router?.network_type !== undefined ? networkTypeLabel(router.network_type) : null}
        />
        <DetailRow label="RSRP" value={dbm(router?.signal_rsrp_dbm, 'dBm')} />
        <DetailRow label="RSRQ" value={dbm(router?.signal_rsrq_db, 'dB')} />
        <DetailRow label="SINR" value={dbm(router?.signal_sinr_db, 'dB')} />
        <DetailRow label="RSSI" value={dbm(router?.signal_rssi_dbm, 'dBm')} />
        <DetailRow
          label="Uptime"
          value={router?.uptime_s !== undefined ? formatUptime(router.uptime_s) : null}
        />
        <DetailRow
          label="Data this month"
          value={
            router?.data_used_month_rx_b !== undefined && router?.data_used_month_tx_b !== undefined
              ? `↓ ${formatBytes(router.data_used_month_rx_b)} · ↑ ${formatBytes(router.data_used_month_tx_b)}`
              : null
          }
        />
      </DetailList>
    </>
  )
}

export function HubView() {
  const { status, hubStatus, drivers } = useSettingsData()
  const { connection } = useSession()
  const counts = driverCounts(drivers)
  let broker: URL | null = null
  try {
    broker = connection === null ? null : new URL(connection.config.url)
  } catch {
    // an address that does not parse shows as unknown
  }
  const protocol =
    broker === null ? null : broker.protocol === 'wss:' ? 'WebSocket (TLS)' : 'WebSocket'
  return (
    <>
      <DetailList heading="Bus link">
        <DetailRow
          label="Status"
          value={busStatusText(status)}
          tone={status === 'connected' ? 'ok' : status === 'connecting' ? 'unknown' : 'offline'}
        />
        {/* Host and scheme only, never the whole URL: a broker address can carry a secret. */}
        <DetailRow label="Broker" value={broker?.host ?? null} />
        <DetailRow label="Protocol" value={protocol} />
        <DetailRow
          label="Login"
          value={connection === null ? null : connection.config.username ? 'Required' : 'None'}
        />
        <DetailRow
          label="Reached over"
          value={broker === null ? null : hubRouteText(classifyHost(broker.hostname))}
        />
      </DetailList>
      <DetailList heading="Hub">
        <DetailRow label="Address" value={hubStatus?.ip ?? null} />
        <DetailRow label="Hostname" value={hubStatus?.hostname ?? null} />
        <DetailRow label="Version" value={hubStatus?.version ?? null} />
      </DetailList>
      <DetailList heading="Drivers">
        <DetailRow label="On the bus" value={driverCountsText(counts)} />
        <DetailRow label="Total" value={String(counts.total)} />
      </DetailList>
    </>
  )
}

export function TailscaleView() {
  const { tailscale } = useSettingsData()
  const endpoints = tailscaleEndpoints(tailscale)
  return (
    <>
      <DetailList>
        <DetailRow
          label="Status"
          value={tailscaleStatusText(tailscale)}
          tone={tailscale?.connected ? 'ok' : 'offline'}
        />
      </DetailList>
      <DetailList heading="Node">
        <DetailRow label="Daemon" value={tailscaleDaemonText(tailscale)} />
        <DetailRow label="Address" value={tailscale?.ip ?? null} />
        <DetailRow label="Hostname" value={tailscale?.hostname ?? null} />
        <DetailRow
          label="Peers"
          value={tailscale?.connected ? tailscalePeersText(tailscale.peers) : null}
        />
      </DetailList>
      <DetailList heading="Reachable at">
        {endpoints.length > 0 ? (
          endpoints.map(({ label, value }) => <DetailRow key={label} label={label} value={value} />)
        ) : (
          <DetailRow label="Dashboard" value={null} />
        )}
      </DetailList>
    </>
  )
}
