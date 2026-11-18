import { useRef, useState } from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LogoLockup } from '@/components/Logo'
import { NativeButton, NativeTextField } from '@/components/native'
import { parseHubAddress } from '@/session/hubAddress'
import { useSession } from '@/session/SessionProvider'
import { useTheme } from '@/theme'

/**
 * The sign-in screen, the app's version of the dashboard's login page: the same welcome and the
 * same user and password, plus the one thing a browser gets from its address bar, the van's
 * address. A `ws://` address connects straight to the broker with a broker account instead.
 */
export default function SignIn() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const session = useSession()
  // The fields own their text (they are native text fields); these mirror it for submit.
  const address = useRef(session.lastAddress)
  const user = useRef(session.lastUser)
  const password = useRef('')
  const [direct, setDirect] = useState(isBroker(session.lastAddress))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    const problem = await session.signIn({
      address: address.current,
      user: user.current,
      password: password.current,
    })
    // On success the protected routes swap this screen for the tabs; nothing more to do here.
    if (problem !== null) {
      setError(problem)
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.intro}>
          <LogoLockup size={36} />
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome to your van</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Sign in to see and control it.
          </Text>
        </View>

        {session.notice ? (
          <Text style={[styles.notice, { color: colors.warning }]}>{session.notice}</Text>
        ) : null}

        <View style={styles.form}>
          <NativeTextField
            label="Van address"
            defaultValue={session.lastAddress}
            keyboard="uri"
            onChangeText={(text) => {
              address.current = text
              setDirect(isBroker(text))
              setError(null)
            }}
          />
          <NativeTextField
            label={direct ? 'Broker user (optional)' : 'User'}
            defaultValue={session.lastUser}
            onChangeText={(text) => {
              user.current = text
            }}
          />
          <NativeTextField
            label={direct ? 'Broker password (optional)' : 'Password'}
            secure
            keyboard="password"
            error={error}
            onChangeText={(text) => {
              password.current = text
              setError(null)
            }}
            onSubmit={() => void submit()}
          />
          <NativeButton
            label={busy ? 'Connecting…' : direct ? 'Connect' : 'Sign in'}
            disabled={busy}
            onPress={() => void submit()}
          />
        </View>

        <Text style={[styles.foot, { color: colors.muted }]}>
          {direct
            ? 'A ws:// address connects straight to the van’s broker. It works on the van’s own network only.'
            : 'Use the address you open the dashboard with, such as 192.168.1.50 or your van’s Tailscale name. This app can control the van, so it needs a login.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function isBroker(address: string): boolean {
  const parsed = parseHubAddress(address)
  return parsed.ok && parsed.target.kind === 'broker'
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 24 },
  intro: { alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 14 },
  notice: { fontSize: 14, textAlign: 'center' },
  form: { gap: 12, width: '100%', maxWidth: 420, alignSelf: 'center' },
  foot: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
})
