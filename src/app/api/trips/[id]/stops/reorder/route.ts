import { NextRequest, NextResponse } from 'next/server'
import { eq, inArray } from 'drizzle-orm'

import { db } from '@/lib/db'
import { stops, tripDays } from '@/lib/db/schema'
import { requireTripEditor } from '@/lib/api/guards'

export const dynamic = 'force-dynamic'

interface DayArrangement {
  day_id: string
  stop_ids: string[]
}

/**
 * PATCH /api/trips/:id/stops/reorder
 *
 * Body: { days: [{ day_id, stop_ids: [...] }] }
 *
 * One endpoint covers reordering within a day and moving stops between days,
 * because a drag-and-drop gesture can do both at once and the result has to
 * land as a single atomic change. Sending them as separate calls would leave
 * the itinerary briefly inconsistent if the second one failed.
 *
 * The payload must list every stop that will live in each day it mentions.
 * Anything left out would keep its old position and silently collide with a
 * newly assigned one, so an incomplete arrangement is rejected rather than
 * half-applied.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params
    const guard = await requireTripEditor(tripId)
    if (!guard.ok) return guard.response

    const body = await request.json().catch(() => ({}))
    const arrangements: DayArrangement[] = body.days

    if (!Array.isArray(arrangements) || arrangements.length === 0) {
      return NextResponse.json(
        { error: 'days must be a non-empty array of { day_id, stop_ids }' },
        { status: 400 }
      )
    }

    const dayIds = arrangements.map((d) => d.day_id)
    const payloadStopIds = arrangements.flatMap((d) => d.stop_ids ?? [])

    if (new Set(payloadStopIds).size !== payloadStopIds.length) {
      return NextResponse.json(
        { error: 'The same stop appears more than once' },
        { status: 400 }
      )
    }

    // Every referenced day must belong to this trip.
    const ownedDays = await db
      .select({ id: tripDays.id })
      .from(tripDays)
      .where(eq(tripDays.tripId, tripId))
    const ownedDayIds = new Set(ownedDays.map((d) => d.id))

    if (dayIds.some((id) => !ownedDayIds.has(id))) {
      return NextResponse.json(
        { error: 'One or more days do not belong to this trip' },
        { status: 400 }
      )
    }

    // Every stop currently sitting in a listed day must be accounted for.
    const currentStops = await db
      .select({ id: stops.id, dayId: stops.dayId })
      .from(stops)
      .where(inArray(stops.dayId, dayIds))

    const payloadSet = new Set(payloadStopIds)
    const missing = currentStops.filter((s) => !payloadSet.has(s.id))
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error:
            'Incomplete arrangement: every stop in the listed days must be included',
          missing_stop_ids: missing.map((s) => s.id),
        },
        { status: 400 }
      )
    }

    // Any stop being moved in from elsewhere must still belong to this trip.
    if (payloadStopIds.length > 0) {
      const owned = await db
        .select({ id: stops.id })
        .from(stops)
        .where(inArray(stops.id, payloadStopIds))
      const ownedIds = new Set(owned.map((s) => s.id))

      const foreign = payloadStopIds.filter((id) => !ownedIds.has(id))
      if (foreign.length > 0) {
        return NextResponse.json(
          { error: 'One or more stops do not exist', unknown_stop_ids: foreign },
          { status: 400 }
        )
      }

      const tripStops = await db
        .select({ id: stops.id })
        .from(stops)
        .where(eq(stops.tripId, tripId))
      const tripStopIds = new Set(tripStops.map((s) => s.id))

      if (payloadStopIds.some((id) => !tripStopIds.has(id))) {
        return NextResponse.json(
          { error: 'One or more stops do not belong to this trip' },
          { status: 400 }
        )
      }
    }

    await db.transaction(async (tx) => {
      for (const arrangement of arrangements) {
        for (const [index, stopId] of (arrangement.stop_ids ?? []).entries()) {
          await tx
            .update(stops)
            .set({ dayId: arrangement.day_id, position: index + 1 })
            .where(eq(stops.id, stopId))
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reorder stops error:', error)
    return NextResponse.json({ error: 'Failed to reorder stops' }, { status: 500 })
  }
}
