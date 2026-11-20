// THROWAWAY (#25 spike): a tab's content that makes state, scroll and focus behaviour visible.
import { Link, useIsFocused } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useTheme } from '@/theme'

export function SpikeScreen({ name, detail }: { name: string; detail?: string }) {
  const { colors } = useTheme()
  const focused = useIsFocused()
  const [count, setCount] = useState(0)
  const mounts = useRef(0)
  const [mountedAt] = useState(() => new Date().toLocaleTimeString())
  const [focusLog, setFocusLog] = useState(0)
  useEffect(() => {
    mounts.current += 1
  }, [])
  useEffect(() => {
    if (focused) setFocusLog((n) => n + 1)
  }, [focused])
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: '700' }}>{name}</Text>
      <Text style={{ color: colors.muted }}>
        mounted at {mountedAt} · focused {String(focused)} · focus count {focusLog}
      </Text>
      <Pressable
        onPress={() => setCount((n) => n + 1)}
        style={{ backgroundColor: colors.accent, padding: 14, borderRadius: 12 }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>State kept? count = {count}</Text>
      </Pressable>
      {detail ? (
        <Link href={detail as never} style={{ color: colors.accent, fontSize: 16 }}>
          Push a detail page in this tab
        </Link>
      ) : null}
      {Array.from({ length: 40 }, (_, i) => (
        <View
          key={i}
          style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 12 }}
        >
          <Text style={{ color: colors.foreground }}>
            {name} row {i + 1} (scroll, switch tab, come back)
          </Text>
        </View>
      ))}
    </ScrollView>
  )
}
