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

  return new Promise<T | null>((resolve) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => {
      channel.port1.close()
      resolve(null)
    }, TIMEOUT_MS)

    channel.port1.onmessage = (event) => {
      clearTimeout(timer)
      channel.port1.close()
      resolve((event.data ?? null) as T | null)
    }

    try {
      sw.postMessage(message, [channel.port2])
    } catch {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

/** Cache a trip so it opens without a network connection. */
export async function saveTripOffline(
  tripId: string,
  tripData: unknown
): Promise<boolean> {
  const result = await request<{ ok?: boolean }>({
    type: 'SAVE_TRIP_OFFLINE',
    tripId,
    tripData,
  })
  return Boolean(result?.ok)
}

/** Drop a trip from the offline cache. */
export async function removeTripOffline(tripId: string): Promise<boolean> {
  const result = await request<{ ok?: boolean }>({
    type: 'REMOVE_TRIP_OFFLINE',
    tripId,
  })
  return Boolean(result?.ok)
}

/** Read a cached trip, or null if this trip was never saved. */
export async function getCachedTrip<T = unknown>(
  tripId: string
): Promise<T | null> {
  const result = await request<{ tripData?: T | null }>({
    type: 'GET_CACHED_TRIP',
    tripId,
  })
  return (result?.tripData ?? null) as T | null
}
