import { NextRequest, NextResponse } from 'next/server'
import { and, eq, max } from 'drizzle-orm'

import { db } from '@/lib/db'
import { stops, tripDays } from '@/lib/db/schema'
import { serializeStop } from '@/lib/db/serialize'
import { requireTripEditor } from '@/lib/api/guards'

export const dynamic = 'force-dynamic'

/**
 * POST /api/trips/:id/stops — add a stop to a day.
 *
 * Stops are addressed as `/trips/:id/stops/:stopId` rather than nested under
 * `/days/:dayId/stops/:stopId`. A stop already carries its day_id, so nesting
 * would put the same fact in two places and make "move to another day" a
 * change of URL rather than a change of field.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params
    const guard = await requireTripEditor(tripId)
    if (!guard.ok) return guard.response

    const body = await request.json().catch(() => ({}))

    if (!body.day_id) {
      return NextResponse.json({ error: 'day_id is required' }, { status: 400 })
    }
    if (!body.place_name?.trim()) {
      return NextResponse.json({ error: 'place_name is required' }, { status: 400 })
    }

    // The day must belong to this trip, or a caller could attach stops to
    // another user's itinerary by supplying its day_id.
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

    const [{ highest }] = await db
      .select({ highest: max(stops.position) })
      .from(stops)
      .where(eq(stops.dayId, day.id))

    const [stop] = await db
      .insert(stops)
      .values({
        dayId: day.id,
        tripId,
        position: (highest ?? 0) + 1,
        placeName: String(body.place_name).trim(),
        placeId: body.place_id ?? null,
        category: body.category ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        address: body.address ?? null,
        startTime: body.start_time || null,
        durationMinutes: Number(body.duration_minutes) || 60,
        estimatedCost: String(Number(body.estimated_cost) || 0),
        travelTimeFromPrev: Number(body.travel_time_from_prev) || 0,
        travelMode: body.travel_mode ?? null,
        openingHours: body.opening_hours ?? null,
        notes: body.notes ?? null,
      })
      .returning()

    return NextResponse.json({ stop: serializeStop(stop) }, { status: 201 })
  } catch (error) {
    console.error('Create stop error:', error)
    return NextResponse.json({ error: 'Failed to create stop' }, { status: 500 })
  }
}
