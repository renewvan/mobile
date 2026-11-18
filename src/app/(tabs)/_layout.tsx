import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { alpha, useTheme } from '@/theme'

/**
 * The app's primary navigation: the platform's own tab bar (Material 3 bottom navigation on
 * Android), not one drawn in JavaScript.
 *
 * Android allows at most five tabs here, and the dashboard has more pages than that, so the
 * dashboard's Heater and Temperature pages share one tab, Climate. Map, Alerts and Settings are
 * not in this version.
 */
export default function TabsLayout() {
  const { colors } = useTheme()
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      iconColor={colors.muted}
      tintColor={colors.accent}
      indicatorColor={alpha(colors.accent, 0.18)}
      rippleColor={alpha(colors.accent, 0.12)}
      labelStyle={{ color: colors.muted, fontSize: 12 }}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon md="speed" sf="gauge.medium" />
        <NativeTabs.Trigger.Label>Start</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="power">
        <NativeTabs.Trigger.Icon md="bolt" sf="bolt" />
        <NativeTabs.Trigger.Label>Power</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tanks">
        <NativeTabs.Trigger.Icon md="water_drop" sf="drop" />
        <NativeTabs.Trigger.Label>Tanks</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="climate">
        <NativeTabs.Trigger.Icon md="device_thermostat" sf="thermometer.medium" />
        <NativeTabs.Trigger.Label>Climate</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="relays">
        <NativeTabs.Trigger.Icon md="toggle_on" sf="switch.2" />
        <NativeTabs.Trigger.Label>Relays</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
