/**
 * One-off geocoding backfill for stops that have no lat/lng.
 *
 * Run manually: npx tsx scripts/backfill-geocode.ts
 *
 * Uses DATABASE_URL from .env.local (loaded via dotenv/config). Nominatim
 * enforces 1 req/s, so this processes stops sequentially with a 1050 ms delay.
 * A 15-stop trip takes ~16 seconds — plan accordingly.
 *
 * This script is deliberately NOT run on deploy. Bulk geocoding against
 * Nominatim risks an IP ban. Only run it when you have a specific need.
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import { eq, isNull } from 'drizzle-orm'

import { schema } from '../src/lib/db'
import { geocodeByQuery, buildGeocodeQuery } from '../src/lib/geocode'

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
const db = drizzle(pool, { schema })

const DELAY_MS = 1050

async function main() {
  // Find every stop with no coordinates, along with its trip destination so we
  // can scope the query (helps Nominatim return the right result).
  const ungeocoded = await db
    .select({
      id: schema.stops.id,
      placeName: schema.stops.placeName,
      address: schema.stops.address,
      destination: schema.trips.destination,
      destinationLat: schema.trips.destinationLat,
      destinationLng: schema.trips.destinationLng,
    })
    .from(schema.stops)
    .leftJoin(schema.trips, eq(schema.stops.tripId, schema.trips.id))
    .where(isNull(schema.stops.lat))

  if (ungeocoded.length === 0) {
    console.log('No stops need geocoding — all done.')
    await pool.end()
    return
  }

  console.log(`Backfilling ${ungeocoded.length} stop(s)...\n`)

  let done = 0
  let skipped = 0

  for (const stop of ungeocoded) {
    // Build the best query: place name, optionally prefixed with the trip
    // destination for disambiguation. If we have the trip's lat/lng we could
    // pass it to Nominatim's bounded search, but that requires additional
    // rate-limited lookups, so we skip it here.
    const placeName = stop.placeName ?? ''
    const addr = stop.address ?? undefined

    if (!placeName.trim()) {
      console.warn(`[skip] stop ${stop.id} has no place_name — skipping.`)
      skipped++
      done++
      continue
    }

    // Nominatim handles "Amber Fort, Jaipur" well even without a bounding box,
    // but if we have the destination coordinates we can use them as a hint.
    let query = buildGeocodeQuery(placeName, addr)
    if (stop.destination && !query.includes(stop.destination)) {
      query = `${stop.destination}, ${query}`
    }

    console.log(`[${done + 1}/${ungeocoded.length}] ${stop.id} — "${query}"`)

    const outcome = await geocodeByQuery(query, { delayMs: DELAY_MS })

    if (outcome.lat !== null) {
      await db
        .update(schema.stops)
        .set({ lat: outcome.lat, lng: outcome.lng })
        .where(eq(schema.stops.id, stop.id))

      console.log(`  -> ${outcome.lat}, ${outcome.lng} (${outcome.displayName})`)
    } else {
      console.warn(`  -> no result (Nominatim returned nothing or was rate-limited)`)
    }

    done++
  }

  console.log(`\nDone: ${done - skipped} geocoded, ${skipped} skipped.`)
  await pool.end()
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  pool.end().then(() => process.exit(1))
})
