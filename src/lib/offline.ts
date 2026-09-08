/**
 * Offline trip cache — the browser half of the service worker contract.
 *
 * public/sw.js implements the message handlers; this module is the only thing
 * that talks to them. Without it the handlers are unreachable and "offline
 * support" is a service worker that caches JS and nothing else.
 *
 * Everything here fails soft. No service worker, no browser support, a
 * controller that has not taken over the page yet — all of it resolves to
 * "no cached copy" rather than throwing into the UI.
 */

const TIMEOUT_MS = 3000

function controller(): ServiceWorker | null {
  if (typeof navigator === 'undefined') return null
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.controller
}

/**
 * Send a message to the service worker and wait for its reply on a
 * MessageChannel port. Resolves to null on timeout so a wedged or updating
 * worker can never hang the page.
 */
function request<T>(message: Record<string, unknown>): Promise<T | null> {
  const sw = controller()
  if (!sw) return Promise.resolve(null)
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), TIMEOUT_MS)
    const channel = new MessageChannel()
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout)
      resolve(event.data as T)
    }
    sw.postMessage(message, [channel.port2])
  })
}

/** Save a trip for offline access. Returns the ISO timestamp if saved, null if not. */
export async function saveTripOffline(
  tripId: string,
  tripData: unknown
): Promise<string | null> {
  const result = await request<{ ok?: boolean; savedAt?: string }>({
    type: 'SAVE_TRIP_OFFLINE',
    tripId,
    tripData,
  })
  return result?.ok ? (result.savedAt ?? null) : null
}

/** Drop a trip from the offline cache. */
export async function removeTripOffline(tripId: string): Promise<boolean> {
  const result = await request<{ ok?: boolean }>({
    type: 'REMOVE_TRIP_OFFLINE',
    tripId,
  })
  return Boolean(result?.ok)
}

/**
 * Read a cached trip. Returns { trip, savedAt } or null if not saved.
 * Use `checkTripSaved` for a lightweight presence check without loading trip data.
 */
export async function getCachedTrip<T = unknown>(
  tripId: string
): Promise<{ trip: T | null; savedAt: string | null }> {
  const result = await request<{ tripData?: T | null; savedAt?: string | null }>({
    type: 'GET_CACHED_TRIP',
    tripId,
  })
  return {
    trip: result?.tripData ?? null,
    savedAt: result?.savedAt ?? null,
  }
}

/** Lightweight check: is this trip saved for offline? Returns null on failure. */
export async function checkTripSaved(
  tripId: string
): Promise<{ saved: boolean; savedAt: string | null }> {
  const result = await request<{ saved?: boolean; savedAt?: string | null }>({
    type: 'CHECK_SAVED',
    tripId,
  })
  return {
    saved: Boolean(result?.saved),
    savedAt: result?.savedAt ?? null,
  }
}
