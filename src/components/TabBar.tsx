import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui'
import { Droplets, Settings, ToggleRight, Van, Zap } from 'lucide-react-native'
import { useEffect, useState, type ComponentType } from 'react'
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { alpha, useTheme } from '@/theme'

type Icon = ComponentType<{ size?: number; color?: string }>

/** Labels stay on one line however large the system text is. */
const LABEL_SCALE_CAP = 1.2
const RAISED = 60

/** One tab: a flat icon over a label, or the raised round Home button. */
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
      style={styles.item}
    >
      {raised ? (
        <View
          style={[
            styles.raised,
            {
              backgroundColor: isFocused ? colors.accent : colors.surface,
              borderColor: colors.background,
            },
          ]}
        >
          <Icon size={28} color={isFocused ? 'white' : colors.muted} />
        </View>
      ) : (
        <Icon size={24} color={tint} />
      )}
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={LABEL_SCALE_CAP}
        style={[styles.label, { color: tint, marginTop: raised ? 2 : 4 }]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/** The bar goes while the keyboard is up, so it is never pushed above it. */
function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setShown(true),
    )
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setShown(false),
    )
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  return shown
}

/**
 * The app's bottom bar (ADR 0004): one flat bar drawn here, headless tabs from `expo-router/ui`,
 * the same on Android and iOS. Energy, Controls, a raised Home in the centre, Levels, Settings.
 * Each tab's route folder is `energy`, `controls`, `home`, `levels`, `settings`, with its own stack.
 */
export function TabBar() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const keyboard = useKeyboardShown()
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <View
          accessibilityRole="tablist"
          // A Slot child takes one flat style object, not an array.
          style={StyleSheet.flatten([
            styles.bar,
            {
              backgroundColor: colors.surface,
              borderTopColor: alpha(colors.muted, 0.2),
              paddingBottom: insets.bottom,
            },
            keyboard && styles.hidden,
          ])}
        >
          <TabTrigger name="energy" href="/energy" asChild>
            <Item label="Energy" Icon={Zap} href="/energy" />
          </TabTrigger>
          <TabTrigger name="controls" href="/controls" asChild>
            <Item label="Controls" Icon={ToggleRight} href="/controls" />
          </TabTrigger>
          <TabTrigger name="home" href="/home" asChild>
            <Item label="Home" Icon={Van} href="/home" raised />
          </TabTrigger>
          <TabTrigger name="levels" href="/levels" asChild>
            <Item label="Levels" Icon={Droplets} href="/levels" />
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <Item label="Settings" Icon={Settings} href="/settings" />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  hidden: { display: 'none' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  label: { fontSize: 12 },
  raised: {
    width: RAISED,
    height: RAISED,
    borderRadius: RAISED / 2,
    marginTop: -RAISED / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    // elevation is Android's; iOS needs the shadow props.
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
})
