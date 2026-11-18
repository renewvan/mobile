// The module path the dashboard's copied helpers (`src/lib/connection.ts`, `tailscale.ts`) import
// their bus types from. Here the bus lives in `src/bus`; this re-exports its types under the
// dashboard's names so those files stay byte-for-byte copies.
export type { ConnectionStatus } from '@/bus/RenewvanBusProvider'
export type {
  AutoSleepTimeoutMinutes,
  DisplayPower,
  HubStatus,
  TailscaleStatus,
} from '@/bus/reducer'
export type RouterHealth = 'online' | 'offline'
