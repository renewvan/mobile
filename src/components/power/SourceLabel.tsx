import { Text } from 'react-native'
import { useTheme } from '@/theme'

export function SourceLabel({ name }: { name: string | undefined }) {
  const { colors } = useTheme()
  if (!name) return null
  return (
    <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, flexShrink: 1 }}>
      {name}
    </Text>
  )
}
