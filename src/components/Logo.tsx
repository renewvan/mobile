import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, G, Line, Mask, Path, Rect } from 'react-native-svg'
import { useTheme } from '@/theme'

const BLUE = '#0385F7'

/** The renewvan symbol (logo `renewvan-symbol-blue.svg`), redrawn with react-native-svg. */
export function LogoSymbol({ size = 28 }: { size?: number }) {
  return (
    <Svg width={(size * 110) / 80} height={size} viewBox="6 16 110 80">
      <Defs>
        <Mask id="logo-k" maskUnits="userSpaceOnUse" x={0} y={0} width={130} height={110}>
          <Rect width={130} height={110} fill="#fff" />
          <Circle cx={36} cy={78} r={10} fill="#000" />
          <Circle cx={86} cy={78} r={10} fill="#000" />
          <Circle cx={54} cy={52} r={10.5} fill="#000" />
        </Mask>
      </Defs>
      <G stroke={BLUE} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <G mask="url(#logo-k)">
          <G strokeWidth={3}>
            <Line x1={54} y1={52} x2={16} y2={26} />
            <Line x1={54} y1={52} x2={80} y2={26} />
            <Line x1={54} y1={52} x2={106} y2={54} />
            <Line x1={54} y1={52} x2={36} y2={78} />
            <Line x1={54} y1={52} x2={86} y2={78} />
          </G>
          <Path d="M16 26H80L106 54V78H16Z" strokeWidth={6} />
          <G fill={BLUE} stroke="none">
            <Circle cx={16} cy={26} r={6.5} />
            <Circle cx={80} cy={26} r={6.5} />
            <Circle cx={106} cy={54} r={6.5} />
            <Circle cx={106} cy={78} r={6.5} />
            <Circle cx={16} cy={78} r={6.5} />
          </G>
        </G>
        <Circle cx={54} cy={52} r={7.25} strokeWidth={6.5} />
        <Circle cx={36} cy={78} r={10} strokeWidth={6} />
        <Circle cx={86} cy={78} r={10} strokeWidth={6} />
      </G>
    </Svg>
  )
}

/** The symbol beside the wordmark, as in the dashboard's header. */
export function LogoLockup({ size = 28 }: { size?: number }) {
  const { colors } = useTheme()
  return (
    <View accessibilityRole="header" accessibilityLabel="renewvan" style={styles.lockup}>
      <LogoSymbol size={size} />
      <Text style={[styles.word, { color: colors.foreground, fontSize: size * 0.72 }]}>
        renew<Text style={{ color: BLUE }}>van</Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontWeight: '700', letterSpacing: -0.5 },
})
