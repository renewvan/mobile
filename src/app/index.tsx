import { Redirect } from 'expo-router'
import { useSession } from '@/session/SessionProvider'

/**
 * The app opens on Home, or on sign-in when no van is signed in: `index` sits outside the
 * protected groups, so a redirect into a guarded route would be refused and leave a blank screen.
 */
export default function Index() {
  const { status } = useSession()
  return <Redirect href={status === 'ready' ? '/home' : '/sign-in'} />
}
