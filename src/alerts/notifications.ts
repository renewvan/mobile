import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import type { AlertEntry } from './alertLog'

// An alert as a system notification: the phone's counterpart of the dashboard's alert toast.
// These are local notifications, posted by the app while it is running and connected to the van;
// nothing remote sends them (see README › Alerts).

const CHANNEL = 'alerts'

// Show an alert even while the app is in front, as the dashboard does with its toast.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Android 13+ only shows its permission prompt once a channel exists.
let channel: Promise<unknown> | undefined
function ensureChannel() {
  channel ??=
    Platform.OS === 'android'
      ? Notifications.setNotificationChannelAsync(CHANNEL, {
          name: 'Alerts',
          importance: Notifications.AndroidImportance.HIGH,
        })
      : Promise.resolve()
  return channel
}

/** Whether the phone lets the app post notifications, asking once if it still may. */
export async function ensureNotificationPermission(): Promise<boolean> {
  await ensureChannel()
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  return (await Notifications.requestPermissionsAsync()).granted
}

/** Posts one alert; the entry id is the notification's, so `dismissAlert` can take it back down. */
export async function notifyAlert(entry: AlertEntry): Promise<void> {
  if (!(await ensureNotificationPermission())) return
  await Notifications.scheduleNotificationAsync({
    identifier: entry.id,
    content: { title: entry.title, body: entry.description, data: { url: '/alerts' } },
    trigger: { channelId: CHANNEL },
  })
}

/** Takes a resolved alert's notification out of the tray. */
export function dismissAlert(entry: AlertEntry): Promise<void> {
  return Notifications.dismissNotificationAsync(entry.id)
}

/** Tapping an alert's notification, also the one that launched the app, opens the Alerts screen. */
export function useOpenAlertsOnTap(): void {
  const response = Notifications.useLastNotificationResponse()
  useEffect(() => {
    if (response) router.push('/alerts')
  }, [response])
}
