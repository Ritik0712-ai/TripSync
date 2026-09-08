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

const STATIC_CACHE = 'tripsync-static-v1'
const DYNAMIC_CACHE = 'tripsync-dynamic-v1'

// Static assets to precache
const PRECACHE_URLS = [
  '/',
  '/dashboard',
]

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

  // API routes — network only, never cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return offline JSON for trip detail routes
        if (url.pathname.match(/^\/api\/trips\/[^/]+\/?$/)) {
          return new Response(
            JSON.stringify({ error: 'You are offline' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        return new Response(JSON.stringify({ error: 'Offline' }), {
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
          const cache = await caches.open(DYNAMIC_CACHE)
          const cached = await cache.match('/dashboard')
          if (cached) return cached
          // Last resort: return the precached root
          return (await caches.match('/')) || new Response('Offline', { status: 503 })
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

  if (type === 'SAVE_TRIP_OFFLINE' && tripId && tripData) {
    caches.open(DYNAMIC_CACHE).then((cache) => {
      const url = `/api/trips/${tripId}`
      cache.put(url, new Response(JSON.stringify({ trip: tripData }), {
        headers: { 'Content-Type': 'application/json' },
      }))
    })
    event.ports[0]?.postMessage({ ok: true })
    return
  }

  if (type === 'REMOVE_TRIP_OFFLINE' && tripId) {
    caches.open(DYNAMIC_CACHE).then(async (cache) => {
      const url = `/api/trips/${tripId}`
      await cache.delete(url)
    })
    event.ports[0]?.postMessage({ ok: true })
    return
  }

  if (type === 'GET_CACHED_TRIP' && tripId) {
    event.ports[0]?.postMessage({ tripId, tripData: null })
    return
  }
})
