import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme'

export interface Tab {
  id: string
  label: string
  content: ReactNode
}

export interface TabsProps {
  tabs: Tab[]
  activeId: string
  onSelect: (id: string) => void
}

/**
 * Domain tab bar (Tanks / Power / Switches) + the active tab's panel, same
 * tabbed interaction as renewvan/dashboard (kiosk/laptop) and matching the
 * `prototype/dashboard-06` variant C layout decision. A custom in-screen
 * tab switcher rather than Expo Router: this is one read-only screen with
 * three panels, not multi-screen navigation — no routes/deep-linking
 * needed for v0.
 */
export function Tabs({ tabs, activeId, onSelect }: TabsProps) {
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0]

  return (
    <View style={styles.container}>
      <View style={styles.bar} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === active.id
          return (
            <Pressable
              key={tab.id}
              onPress={() => onSelect(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <View style={styles.panel} testID="tab-panel">
        {active.content}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.accent },
  tabLabel: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  tabLabelActive: { color: colors.text },
  panel: { flex: 1 },
})
