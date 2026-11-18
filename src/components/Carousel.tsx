import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { ScrollLockContext, useScrollLock } from '@/components/Screen'
import { alpha, useTheme } from '@/theme'

export interface CarouselSlide {
  id: string
  /** Names the slide's dot for a screen reader, e.g. "Readings". */
  label: string
  content: ReactNode
}

/**
 * A swipeable row of full-width slides with a dot per slide underneath, as the dashboard's
 * Carousel. The native pager does the swiping; the dots mirror it and scroll to a slide when
 * pressed. Each dot is 44 tall and 20 wide. A slide is as tall as the tallest one, so the card does
 * not jump as the user swipes. A control inside a slide that follows the finger (the heater dial)
 * locks the pager along with the page, through the same scroll lock.
 */
export function Carousel({ slides, label }: { slides: CarouselSlide[]; label: string }) {
  const { colors } = useTheme()
  const page = useScrollLock()
  const pager = useRef<ScrollView>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState(0)
  const lock = useMemo(
    () => ({
      lock: () => {
        page.lock()
        pager.current?.setNativeProps({ scrollEnabled: false })
      },
      unlock: () => {
        page.unlock()
        pager.current?.setNativeProps({ scrollEnabled: true })
      },
    }),
    [page],
  )

  return (
    <View accessibilityLabel={label} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollLockContext.Provider value={lock}>
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setActive(Math.round(event.nativeEvent.contentOffset.x / width))
          }
        >
          {width > 0 &&
            slides.map((slide, i) => (
              <View
                key={slide.id}
                accessibilityLabel={`${slide.label}, ${i + 1} of ${slides.length}`}
                accessibilityElementsHidden={i !== active}
                importantForAccessibility={i === active ? 'auto' : 'no-hide-descendants'}
                style={{ width }}
              >
                {slide.content}
              </View>
            ))}
        </ScrollView>
      </ScrollLockContext.Provider>
      <View style={styles.dots}>
        {slides.map((slide, i) => (
          <Pressable
            key={slide.id}
            accessibilityRole="button"
            accessibilityLabel={slide.label}
            accessibilityState={{ selected: i === active }}
            onPress={() => {
              pager.current?.scrollTo({ x: i * width, animated: true })
              setActive(i)
            }}
            style={styles.dotHit}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: i === active ? colors.accent : alpha(colors.muted, 0.4) },
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center' },
  dotHit: { width: 20, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
})
