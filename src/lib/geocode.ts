/**
 * Nominatim geocoding — free, no API key, no account.
 *
 * Usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 * - 1 request/second on average; burst allowed but excess gets 429.
 * - Meaningful User-Agent or Referer so they can contact you.
 * - No bulk geocoding; no commercial use without a paid licence.
 *
 * Geocoding is always best-effort. A failure leaves lat/lng null and the
 * caller keeps going. src/lib/maps.ts falls back to a text query so the UI
 * never breaks.
 *
 * @see https://nominatim.org/release-docs/latest/api/Search/
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

/**
 * A real User-Agent is required by Nominatim's policy. It lets them contact
 * the operator before blocking rather than after.
 */
const USER_AGENT =
  'TripSync/1.0 (https://github.com/Ritik0712-ai/TripSync; ritikagarwal2468@gmail.com)'

export interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
}

export interface GeocodeFailure {
  lat: null
  lng: null
  displayName: null
}

export type GeocodeOutcome = GeocodeResult | GeocodeFailure

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Nominatim returns lat/lon as strings. We convert explicitly here so callers
 * always get a number and never have to think about it.
 */
function parseCoords(result: {
  lat: string
  lon: string
  display_name: string
}): GeocodeResult {
  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    displayName: result.display_name,
  }
}

function failure(): GeocodeFailure {
  return { lat: null, lng: null, displayName: null }
}

/**
 * Geocode a free-text query against Nominatim.
 *
 * `delayMs` defaults to 0 — a single lookup should not pause first. It exists
 * for LOOPS: a script geocoding many stops in sequence passes delayMs >= 1050
 * to stay inside the 1 req/s policy. A delay here never rate-limits concurrent
 * requests from different callers (they would all sleep and then fire at the
 * same instant), so it is a pacing knob for serial work, nothing more.
 *
 * On 429 the function gives up immediately rather than retrying — retrying a
 * rate-limited IP is how a temporary throttle becomes a permanent block.
 */
export async function geocodeByQuery(
  query: string,
  { delayMs = 0 }: { delayMs?: number } = {}
): Promise<GeocodeOutcome> {
  const q = query.trim()
  if (!q) return failure()

  if (delayMs > 0) await sleep(delayMs)

  const params = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '1' })

  try {
    const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })

    if (res.status === 429) {
      console.warn('[geocode] Nominatim rate-limited (429); returning null coords')
      return failure()
    }

    if (!res.ok) {
      console.warn(`[geocode] Nominatim returned ${res.status} for query: ${q}`)
      return failure()
    }

    const results = (await res.json()) as unknown[]
    if (!Array.isArray(results) || results.length === 0) return failure()

    return parseCoords(results[0] as { lat: string; lon: string; display_name: string })
  } catch (err) {
    console.error('[geocode] fetch failed:', err)
    return failure()
  }
}

/**
 * Build the best possible query string for a stop. Uses the address if
 * available (more precise), otherwise falls back to the place name alone.
 *
 * If the address already contains the place name (common with POI data) the
 * name is not repeated to avoid diluting the query signal.
 */
export function buildGeocodeQuery(
  placeName: string,
  address: string | null | undefined
): string {
  const name = placeName.trim()
  const addr = address?.trim()

  if (addr && addr !== name) {
    return addr.includes(name) ? addr : `${name}, ${addr}`
  }
  return name
}
