import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { useIsFocused } from 'expo-router'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Freeze } from 'react-freeze'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { layout, useTheme } from '@/theme'
import { AppHeader } from './AppHeader'
import { Banner } from './ui'

/** Holds the page still while a control inside it follows the finger (the heater dial). */
export interface ScrollLock {
  lock: () => void
  unlock: () => void
}

const NO_LOCK: ScrollLock = { lock: () => {}, unlock: () => {} }
const ScrollLockContext = createContext<ScrollLock>(NO_LOCK)

export function useScrollLock(): ScrollLock {
  return useContext(ScrollLockContext)
}

/**
 * One tab's frame: the header, the connection-lost note, and the page's cards stacked in a
 * scrolling column (the dashboard's phone layout). The native tab bar adds its own bottom inset.
 *
 * The note matters because every bus topic is retained: without it, a dropped connection would
 * leave the last values on screen looking live.
 */
export function Screen({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  const { status } = useRenewvanBus()
  // A tab out of sight (another tab, or Settings over it) keeps its last frame and stops
  // re-rendering: every bus flush changes the van's state, and re-rendering all five tabs for each
  // one kept the JS thread busy and the screen in front slow to respond. It catches up when shown.
  const focused = useIsFocused()
  const scroll = useRef<ScrollView>(null)
  // Set on the native view directly: Android's scroll view takes a vertical drag over within a few
  // pixels, sooner than a state update could reach it.
  const scrollLock = useMemo<ScrollLock>(
    () => ({
      lock: () => scroll.current?.setNativeProps({ scrollEnabled: false }),
      unlock: () => scroll.current?.setNativeProps({ scrollEnabled: true }),
    }),
    [],
  )
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader />
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {status === 'disconnected' ? (
          <Banner tone="danger">
            Not connected to the van. Values may be out of date; reconnecting…
          </Banner>
        ) : null}

        <Freeze freeze={!focused}>
          <ScrollLockContext.Provider value={scrollLock}>{children}</ScrollLockContext.Provider>
        </Freeze>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    paddingTop: layout.gap,
    paddingBottom: layout.gutter,
    gap: layout.gap,
  },
})
