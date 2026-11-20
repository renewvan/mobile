import { useLocalSearchParams } from 'expo-router'
import { Droplet } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { availableLevelsPages, LEVELS_PAGES, type LevelsPage } from '@/components/levels/pages'
import { TanksContent, TemperatureContent, TiltContent } from '@/components/levels/LevelsContent'
import { Screen } from '@/components/Screen'
import { EmptyState } from '@/components/ui'
import { useCapabilities } from '@/hooks/useCapabilities'
import { alpha, radius, useTheme } from '@/theme'

/** The Levels tab: Tanks, Temperature and Tilt as sub-tabs (pills) over one page. */
export default function LevelsTab() {
  const { colors } = useTheme()
  const capabilities = useCapabilities()
  const pages = availableLevelsPages(capabilities)
  const [chosen, setChosen] = useState<LevelsPage>('tanks')
  const page = pages.some((candidate) => candidate.id === chosen) ? chosen : pages[0]?.id
  // Home's circles open a given page; `at` changes on every tap so the same page can be asked twice.
  const { page: asked, at } = useLocalSearchParams<{ page?: string; at?: string }>()
  const [seen, setSeen] = useState(at)
  if (at !== seen) {
    setSeen(at)
    const found = LEVELS_PAGES.find((p) => p.id === asked)
    if (found) setChosen(found.id)
  }
  if (pages.length === 0) {
    const loading = [capabilities.tank, capabilities.temperature, capabilities.tilt].some(
      (capability) => capability.state === 'loading',
    )
    return (
      <Screen>
        <EmptyState
          icon={<Droplet size={20} color={colors.muted} />}
          title={loading ? 'Loading levels…' : 'No level sensors on this van.'}
          detail={
            loading
              ? 'Looking for tanks, temperature sensors and tilt.'
              : 'Tanks, temperature and tilt appear here when their drivers are installed.'
          }
        />
      </Screen>
    )
  }
  return (
    <Screen>
      <View accessibilityRole="tablist" style={styles.pills}>
        {pages.map(({ id, label }) => {
          const selected = page === id
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setChosen(id)}
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
