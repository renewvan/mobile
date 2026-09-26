import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { SafeAreaView, StyleSheet } from 'react-native'
import { ConnectionBanner } from './src/components/ConnectionBanner'
import { Tabs } from './src/components/Tabs'
import { useRenewvanBus } from './src/hooks/useRenewvanBus'
import { colors } from './src/theme'
import { PowerTab } from './src/tabs/PowerTab'
import { SwitchesTab } from './src/tabs/SwitchesTab'
import { TanksTab } from './src/tabs/TanksTab'

export default function App() {
  const { state, status } = useRenewvanBus()
  const [activeTab, setActiveTab] = useState('tanks')

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar style="light" />
      <ConnectionBanner status={status} />
      <Tabs
        activeId={activeTab}
        onSelect={setActiveTab}
        tabs={[
          { id: 'tanks', label: 'Tanks', content: <TanksTab tanks={state.tanks} /> },
          { id: 'power', label: 'Power', content: <PowerTab batteries={state.batteries} /> },
          { id: 'switches', label: 'Switches', content: <SwitchesTab relays={state.relays} /> },
        ]}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
})
