import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { TanksContent, TemperatureContent, TiltContent } from '@/components/levels/LevelsContent'
import { Screen } from '@/components/Screen'
import { alpha, radius, useTheme } from '@/theme'

const PAGES = [
  { id: 'tanks', label: 'Tanks' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'tilt', label: 'Tilt' },
] as const

/** The Levels tab: Tanks, Temperature and Tilt as sub-tabs (pills) over one page. */
export default function LevelsTab() {
  const { colors } = useTheme()
  const [page, setPage] = useState<(typeof PAGES)[number]['id']>('tanks')
  return (
    <Screen>
      <View accessibilityRole="tablist" style={styles.pills}>
        {PAGES.map(({ id, label }) => {
          const selected = page === id
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setPage(id)}
              style={[
                styles.pill,
                { backgroundColor: selected ? colors.accent : alpha(colors.muted, 0.15) },
              ]}
            >
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
                style={{ color: selected ? 'white' : colors.foreground, fontWeight: '500' }}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {page === 'tanks' ? (
        <TanksContent />
      ) : page === 'temperature' ? (
        <TemperatureContent />
      ) : (
        <TiltContent />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', gap: 8 },
  pill: { borderRadius: radius['2xl'], paddingHorizontal: 14, paddingVertical: 7 },
})
