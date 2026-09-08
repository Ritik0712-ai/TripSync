import { NextRequest, NextResponse, after } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { stops, tripDays } from '@/lib/db/schema'
import { serializeStop } from '@/lib/db/serialize'
import { requireTripEditor } from '@/lib/api/guards'
import { geocodeByQuery, buildGeocodeQuery } from '@/lib/geocode'

export const dynamic = 'force-dynamic'

/** PATCH /api/trips/:id/stops/:stopId — edit a stop, or move it to another day. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stopId: string }> }
) {
  try {
    const { id: tripId, stopId } = await params
    const guard = await requireTripEditor(tripId)
    if (!guard.ok) return guard.response

    const body = await request.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}

    if (body.place_name !== undefined) {
      if (!String(body.place_name).trim()) {
        return NextResponse.json(
          { error: 'place_name cannot be empty' },
          { status: 400 }
        )
      }
      updates.placeName = String(body.place_name).trim()
    }
    if (body.category !== undefined) updates.category = body.category
    if (body.address !== undefined) updates.address = body.address
    if (body.start_time !== undefined) updates.startTime = body.start_time || null
    if (body.duration_minutes !== undefined)
      updates.durationMinutes = Number(body.duration_minutes) || 0
    if (body.estimated_cost !== undefined)
      updates.estimatedCost = String(Number(body.estimated_cost) || 0)
    if (body.travel_time_from_prev !== undefined)
      updates.travelTimeFromPrev = Number(body.travel_time_from_prev) || 0
    if (body.travel_mode !== undefined) updates.travelMode = body.travel_mode
    if (body.opening_hours !== undefined) updates.openingHours = body.opening_hours
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.lat !== undefined) updates.lat = body.lat
    if (body.lng !== undefined) updates.lng = body.lng
    if (body.place_id !== undefined) updates.placeId = body.place_id
    if (body.is_visited !== undefined) updates.isVisited = Boolean(body.is_visited)
    if (body.is_skipped !== undefined) updates.isSkipped = Boolean(body.is_skipped)

    // Moving a stop between days is a field change, not a different endpoint.
    if (body.day_id !== undefined) {
      const day = await db.query.tripDays.findFirst({
        where: and(eq(tripDays.id, body.day_id), eq(tripDays.tripId, tripId)),
        columns: { id: true },
      })
      if (!day) {
        return NextResponse.json(
          { error: 'That day does not belong to this trip' },
          { status: 400 }
        )
      }
      updates.dayId = day.id
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const [stop] = await db
      .update(stops)
      .set(updates)
      .where(and(eq(stops.id, stopId), eq(stops.tripId, tripId)))
      .returning()

    if (!stop) return NextResponse.json({ error: 'Stop not found' }, { status: 404 })

    const serialized = serializeStop(stop)
    const response = NextResponse.json({ stop: serialized })

    // Re-geocode if place_name or address changed. Coordinates for the old
    // place are wrong for the new one, so clear them before fetching new ones.
    const placeChanged = body.place_name !== undefined
    const addressChanged = body.address !== undefined

    if (placeChanged || addressChanged) {
      const name = (updates.placeName as string | undefined) ?? stop.placeName
      const addr = updates.address as string | undefined
      const query = buildGeocodeQuery(name, addr)

      // Same reasoning as the create route: a floating promise is killed when
      // the serverless invocation freezes, so this has to run inside after().
      // Clearing the stale coordinates lives in here too — doing it eagerly
      // and then losing the refetch would leave the stop permanently unmapped.
      after(async () => {
        try {
          if (placeChanged) {
            await db
              .update(stops)
              .set({ lat: null, lng: null })
              .where(eq(stops.id, stopId))
          }

          if (!query) return

          const outcome = await geocodeByQuery(query)
          if (outcome.lat === null) return

          await db
            .update(stops)
            .set({ lat: outcome.lat, lng: outcome.lng })
            .where(eq(stops.id, stopId))
        } catch (err) {
          console.error('[geocode] background re-geocode failed:', err)
        }
      })
    }

    return response
  } catch (error) {
    console.error('Update stop error:', error)
    return NextResponse.json({ error: 'Failed to update stop' }, { status: 500 })
  }
}

/** DELETE /api/trips/:id/stops/:stopId */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stopId: string }> }
) {
  try {
    const { id: tripId, stopId } = await params
    const guard = await requireTripEditor(tripId)
    if (!guard.ok) return guard.response

    const [removed] = await db
      .delete(stops)
      .where(and(eq(stops.id, stopId), eq(stops.tripId, tripId)))
      .returning({ id: stops.id })

    if (!removed) {
      return NextResponse.json({ error: 'Stop not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete stop error:', error)
    return NextResponse.json({ error: 'Failed to delete stop' }, { status: 500 })
  }
}
