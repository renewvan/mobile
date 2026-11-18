import { Bell, CircleAlert, TriangleAlert, X } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAlerts } from '@/alerts/AlertsProvider'
import type { AlertEntry } from '@/alerts/alertLog'
import { confirm, NativeButton } from '@/components/native'
import { SettingsScreen } from '@/components/settings/kit'
import { Chip, EmptyState, tabular } from '@/components/ui'
import { alpha, radius, useTheme } from '@/theme'

function formatTimestamp(ms: number): string {
  const date = new Date(ms)
  const day = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${day}, ${time}`
}

function AlertRow({ entry, onRemove }: { entry: AlertEntry; onRemove: () => void }) {
  const { colors } = useTheme()
  const resolved = entry.resolvedAt !== undefined
  const tone = entry.type === 'error' ? 'danger' : 'warning'
  const color = colors[tone]
  const Icon = entry.type === 'error' ? CircleAlert : TriangleAlert
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: alpha(color, 0.4),
          opacity: resolved ? 0.7 : 1,
        },
      ]}
    >
      <Icon size={20} color={color} style={styles.icon} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.foreground }]}>{entry.title}</Text>
        <Text style={[styles.description, { color: colors.muted }]}>{entry.description}</Text>
        <View style={styles.meta}>
          <Text style={[styles.time, { color: colors.muted }, tabular]}>
            {formatTimestamp(entry.createdAt)}
          </Text>
          <Chip label={resolved ? 'Resolved' : 'Active'} tone={resolved ? 'success' : tone} />
        </View>
      </View>
      {resolved ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove alert: ${entry.title}`}
          android_ripple={{ color: colors.default, borderless: true, radius: 22 }}
          onPress={onRemove}
          style={styles.remove}
        >
          <X size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  )
}

/**
 * The alert log, newest first, as the dashboard's Alerts page. An open alert stays until its
 * condition clears; only a resolved one can be deleted, one by one or all at once.
 */
export function AlertsScreen() {
  const { colors } = useTheme()
  const { entries, remove, clearResolved } = useAlerts()
  const anyResolved = entries.some((entry) => entry.resolvedAt !== undefined)
  return (
    <SettingsScreen title="Alerts">
      {entries.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} color={colors.muted} />}
          title="Well done, no active alerts!"
          detail="Alerts will appear here as the van reports them."
        />
      ) : (
        <>
          {anyResolved ? (
            <NativeButton
              label="Clear resolved"
              variant="outlined"
              onPress={() =>
                confirm({
                  title: 'Clear resolved alerts?',
                  message: 'Open alerts stay until their condition clears.',
                  action: 'Clear',
                  destructive: true,
                  onConfirm: clearResolved,
                })
              }
            />
          ) : null}
          {entries.map((entry) => (
            <AlertRow key={entry.id} entry={entry} onRemove={() => remove(entry.id)} />
          ))}
        </>
      )}
    </SettingsScreen>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius['2xl'],
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 4,
  },
  icon: { marginTop: 2 },
  text: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '500' },
  description: { fontSize: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  time: { fontSize: 12, fontWeight: '600' },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
})
