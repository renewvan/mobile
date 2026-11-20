import {
  Battery,
  Droplet,
  Heater,
  MapPin,
  Move3d,
  Plug,
  Power,
  Router,
  Sun,
  Thermometer,
  type LucideIcon,
} from 'lucide-react-native'
import type { EntityType } from '@/lib/drivers'

export const TYPE_ICONS: Record<EntityType, LucideIcon> = {
  battery: Battery,
  solar: Sun,
  charger: Plug,
  relay: Power,
  tank: Droplet,
  heater: Heater,
  temperature: Thermometer,
  gps: MapPin,
  tilt: Move3d,
  router: Router,
}
