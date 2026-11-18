// Expo config plugin: Android network security config for talking to a renewvan hub.
//
// The hub serves the dashboard site (and the `/mqtt` WebSocket behind it) over HTTPS with Caddy's
// own local CA (hub `docs/reference.md`, "Trust the root on each phone"). The owner installs that
// root on the phone once, as a *user* CA. Android apps ignore user CAs by default (API 24+), so
// without this the app could never reach a hub the phone's own browser opens fine.
//
// Cleartext is allowed too: on the van LAN the broker's WebSocket listener is plain
// `ws://<host>:9001`, which the "direct broker" connection uses, and Metro needs it in development.
const fs = require('node:fs')
const path = require('node:path')
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins')

const FILE = 'network_security_config.xml'
const XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
`

module.exports = function withHubNetworkSecurity(config) {
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, FILE), XML)
      return cfg
    },
  ])
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0]
    if (application) {
      application.$['android:networkSecurityConfig'] = '@xml/network_security_config'
    }
    return cfg
  })
}
