import { TransformRequestManager } from '@maplibre/maplibre-react-native'

// The hub serves the basemap (`/maps/` beside the dashboard) behind the same login as everything
// else. The app's own requests carry the session through the platform's cookie store; MapLibre
// fetches with its own HTTP client, which does not share it. So the session is added, as a header,
// to MapLibre's requests to this hub and to no other host.
//
// It is set when the session is (not by the map component), so it is in place before any map
// asks for its first tile.

const HEADER_ID = 'renewvan-session'

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Gives the map this hub's session, or takes it away when there is none. */
export function setMapSession(origin: string | null, cookie: string | undefined): void {
  try {
    if (origin === null || cookie === undefined) {
      TransformRequestManager.removeHeader(HEADER_ID)
      return
    }
    TransformRequestManager.addHeader({
      id: HEADER_ID,
      match: escapeRegex(origin),
      name: 'Cookie',
      value: cookie,
    })
  } catch {
    // No native map module (a platform it is not built for): the map shows its own notice.
  }
}
