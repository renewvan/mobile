import { Redirect } from 'expo-router'

/** The app opens on Home. */
export default function Index() {
  return <Redirect href="/home" />
}
