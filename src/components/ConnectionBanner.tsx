import { StyleSheet, Text, View } from 'react-native'
import type { ConnectionStatus } from '../hooks/useRenewvanBus'
import { colors } from '../theme'

export interface ConnectionBannerProps {
  status: ConnectionStatus
}

const COPY: Record<ConnectionStatus, string> = {
  connected: 'renewvan bus connected',
  connecting: 'connecting to renewvan bus…',
  disconnected: 'disconnected — showing last-known state',
}

const DOT_COLOR: Record<ConnectionStatus, string> = {
  connected: colors.ok,
  connecting: colors.accent,
  disconnected: colors.bad,
}

/**
 * Distinguishes a live connection from stale last-known-state values, per
 * hub/.scratch/renewvan-hub-v0-build/issues/07-dashboard-phone-app.md
 * ("surfaces disconnected rather than a silent blank/stale screen").
 */
export function ConnectionBanner({ status }: ConnectionBannerProps) {
  return (
    <View style={styles.banner} testID="connection-banner">
      <View style={[styles.dot, { backgroundColor: DOT_COLOR[status] }]} />
      <Text style={styles.text}>{COPY[status]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: colors.textDim, fontSize: 13 },
})
