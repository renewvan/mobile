// THROWAWAY (#25 spike, variant F): NativeTabs with a pre-drawn disc in the centre slot.
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { alpha, useTheme } from '@/theme'

export default function Layout() {
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
      <NativeTabs.Trigger name="energy">
        <NativeTabs.Trigger.Icon md="bolt" sf="bolt" />
        <NativeTabs.Trigger.Label>Energy</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="controls">
        <NativeTabs.Trigger.Icon md="toggle_on" sf="switch.2" />
        <NativeTabs.Trigger.Label>Controls</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="home">
        {/* The disc keeps its own colours: 'original' on iOS; Android is what the spike checks. */}
        <NativeTabs.Trigger.Icon src={require('../../../assets/spike/van-disc.png')} renderingMode="original" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="levels">
        <NativeTabs.Trigger.Icon md="water_drop" sf="drop" />
        <NativeTabs.Trigger.Label>Levels</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon md="settings" sf="gearshape" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
