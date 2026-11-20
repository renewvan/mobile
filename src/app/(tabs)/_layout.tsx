import { TabBar } from '@/components/TabBar'

/** Home is the first tab shown, wherever the app is entered (sign-in included), though Energy is first in the bar. */
export const unstable_settings = { initialRouteName: 'home' }

/** The app's primary navigation: one custom flat bar (`TabBar`) over a stack per tab. */
export default function TabsLayout() {
  return <TabBar />
}
