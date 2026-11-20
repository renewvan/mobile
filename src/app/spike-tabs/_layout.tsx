// THROWAWAY (#25 spike, variant D): headless tabs (`expo-router/ui`) with a raised centre button.
import { router } from 'expo-router'
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui'
import * as Haptics from 'expo-haptics'
import { Droplets, Settings, ToggleRight, Van, Zap } from 'lucide-react-native'
import type { ComponentType } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { alpha, useTheme } from '@/theme'

type Icon = ComponentType<{ size?: number; color?: string }>

function Item({
  label,
  Icon,
  href,
  raised,
  isFocused = false,
  ...props
}: Partial<TabTriggerSlotProps> & { label: string; Icon: Icon; href: string; raised?: boolean }) {
  const { colors } = useTheme()
  const tint = isFocused ? colors.accent : colors.muted
  return (
    <Pressable
      {...props}
      onPress={(event) => {
        void Haptics.selectionAsync()
        // Tapping the active tab pops its stack back to the first page.
        if (isFocused) router.dismissTo(href as never)
        props.onPress?.(event)
      }}
      android_ripple={{ color: alpha(colors.accent, 0.12), borderless: false }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
    >
      {raised ? (
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            marginTop: -30,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isFocused ? colors.accent : colors.surface,
            borderWidth: 5,
            borderColor: colors.background,
            elevation: 4,
          }}
        >
          <Icon size={28} color={isFocused ? 'white' : colors.muted} />
        </View>
      ) : (
        <Icon size={24} color={tint} />
      )}
      <Text style={{ color: tint, fontSize: 12, marginTop: raised ? 2 : 4 }}>{label}</Text>
    </Pressable>
  )
}

export default function Layout() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <Tabs>
      <TabSlot />
      <TabList
        asChild
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom,
            borderTopWidth: 1,
            borderTopColor: alpha(colors.muted, 0.2),
          }}
        >
          <TabTrigger name="energy" href="/spike-tabs/energy" asChild>
            <Item label="Energy" Icon={Zap} href="/spike-tabs/energy" />
          </TabTrigger>
          <TabTrigger name="controls" href="/spike-tabs/controls" asChild>
            <Item label="Controls" Icon={ToggleRight} href="/spike-tabs/controls" />
          </TabTrigger>
          <TabTrigger name="home" href="/spike-tabs/home" asChild>
            <Item label="Home" Icon={Van} href="/spike-tabs/home" raised />
          </TabTrigger>
          <TabTrigger name="levels" href="/spike-tabs/levels" asChild>
            <Item label="Levels" Icon={Droplets} href="/spike-tabs/levels" />
          </TabTrigger>
          <TabTrigger name="settings" href="/spike-tabs/settings" asChild>
            <Item label="Settings" Icon={Settings} href="/spike-tabs/settings" />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  )
}
