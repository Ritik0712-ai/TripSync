/**
 * TripSync Service Worker
 *
 * Caching strategy:
 * - Static assets (JS/CSS/images): Cache-first, update in background
 * - Navigation requests: Network-first, fall back to cached /dashboard
 * - API requests: Network-only (never cache — user data)
 * - /api/trips/:id: Network-first with offline JSON fallback
 *
 * The SW intercepts fetch events but NEVER caches API responses with
 * other users' data. Only the trips the current user has explicitly
 * saved offline via the "Save offline" message are cached.
 */

const STATIC_CACHE = 'tripsync-static-v2'
const DYNAMIC_CACHE = 'tripsync-dynamic-v2'

// Static assets to precache
const PRECACHE_URLS = [
  '/',
  '/dashboard',
]

/**
 * Cache key for a saved trip. Absolute URL on this origin so it matches
 * regardless of which page did the saving.
 */
function cacheKeyFor(tripId) {
  return new Request(new URL(`/api/trips/${tripId}`, self.location.origin))
}

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Non-fatal — precache failures shouldn't block SW install
      })
    })
  )
  self.skipWaiting()
})

// ─── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ─── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip cross-origin requests (maps, fonts, etc.)
  if (url.origin !== self.location.origin) return

  // API routes — network first, never written to cache by this handler.
  // The only API responses in the cache are trips the user explicitly saved
  // via SAVE_TRIP_OFFLINE, so serving one back can never leak another user's
  // data: it is the same user's own copy, put there from their own session.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(async () => {
        if (url.pathname.match(/^\/api\/trips\/[^/]+\/?$/)) {
          const cache = await caches.open(DYNAMIC_CACHE)
          const cached = await cache.match(request)
          if (cached) return cached
        }
        return new Response(JSON.stringify({ error: 'You are offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      })
    )
    return
  }

  // Navigation — network first, fallback to cached dashboard
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => {
          // Try the exact page first, then the precached shells. These live in
          // STATIC_CACHE (that is where install put them) — the old code looked
          // in DYNAMIC_CACHE and always missed.
          const cached =
            (await caches.match(request)) ||
            (await caches.match('/dashboard')) ||
            (await caches.match('/'))
          return cached || new Response('Offline', { status: 503 })
        })
    )
    return
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone))
        }
        return response
      }).catch(() => cached)
    })
  )
})

// ─── Message: save/remove a trip from offline cache ─────────────────────────
self.addEventListener('message', (event) => {
  const { type, tripId, tripData } = event.data || {}

  const port = event.ports && event.ports[0]
  const reply = (payload) => {
    if (port) port.postMessage(payload)
  }

  if (type === 'SAVE_TRIP_OFFLINE' && tripId && tripData) {
    // waitUntil, so the browser does not kill the worker mid-write. Replying
    // only after the put resolves means the caller learns about failures
    // instead of being told "ok" for a write that never landed.
    event.waitUntil(
      caches
        .open(DYNAMIC_CACHE)
        .then((cache) =>
          cache.put(
            cacheKeyFor(tripId),
            new Response(JSON.stringify({ trip: tripData }), {
              headers: { 'Content-Type': 'application/json' },
            })
          )
        )
        .then(() => reply({ ok: true }))
        .catch((err) => {
          console.warn('[SW] save trip failed:', err)
          reply({ ok: false })
        })
    )
    return
  }

  if (type === 'REMOVE_TRIP_OFFLINE' && tripId) {
    event.waitUntil(
      caches
        .open(DYNAMIC_CACHE)
        .then((cache) => cache.delete(cacheKeyFor(tripId)))
        .then((deleted) => reply({ ok: deleted }))
        .catch(() => reply({ ok: false }))
    )
    return
  }

  if (type === 'GET_CACHED_TRIP' && tripId) {
    // Previously hardcoded to null, which made every saved trip unreadable and
    // the whole offline path decorative. Actually read the cache now.
    event.waitUntil(
      caches
        .open(DYNAMIC_CACHE)
        .then((cache) => cache.match(cacheKeyFor(tripId)))
        .then(async (cached) => {
          if (!cached) return reply({ tripId, tripData: null })
          const body = await cached.json()
          reply({ tripId, tripData: body.trip ?? null })
        })
        .catch(() => reply({ tripId, tripData: null }))
    )
    return
  }

  reply({ ok: false, error: 'Unknown message type' })
})
