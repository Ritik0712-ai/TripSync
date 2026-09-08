import { NextRequest, NextResponse, after } from 'next/server'
import { and, desc, eq, inArray, or } from 'drizzle-orm'

import { db } from '@/lib/db'
import { trips, tripDays, stops, tripMembers } from '@/lib/db/schema'
import { serializeTrip } from '@/lib/db/serialize'
import { getCurrentUserId } from '@/lib/auth/server'
import { geocodeByQuery } from '@/lib/geocode'

export const dynamic = 'force-dynamic'

/**
 * GET /api/trips — trips the user owns *or* has been invited to.
 *
 * The old version filtered on owner_id only, which meant joining a shared trip
 * appeared to succeed but the trip never showed up anywhere.
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memberTripIds = db
      .select({ id: tripMembers.tripId })
      .from(tripMembers)
      .where(eq(tripMembers.userId, userId))

    const rows = await db.query.trips.findMany({
      where: or(eq(trips.ownerId, userId), inArray(trips.id, memberTripIds)),
      with: { days: { with: { stops: true } } },
      orderBy: desc(trips.createdAt),
    })

    return NextResponse.json({
      trips: rows.map((t) =>
        serializeTrip(t, { is_owner: t.ownerId === userId })
      ),
    })
  } catch (error) {
    console.error('Get trips error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/trips — save a generated itinerary.
 *
 * Trip + days + stops are written in a single transaction so a partial failure
 * can't leave a trip with half its days.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body?.title || !body?.destination) {
      return NextResponse.json(
        { error: 'title and destination are required' },
        { status: 400 }
      )
    }

    const tripId = await db.transaction(async (tx) => {
      const [trip] = await tx
        .insert(trips)
        .values({
          ownerId: userId,
          title: body.title,
          destination: body.destination,
          startDate: body.startDate || null,
          endDate: body.endDate || null,
          budgetTotal: String(body.budgetTotal ?? 0),
          currency: body.currency || 'INR',
          travelStyle: body.travelStyle || null,
          interests: body.interests ?? [],
          groupSize: Number(body.groupSize) || 1,
          status: 'planning',
        })
        .returning({ id: trips.id })

      for (const day of body.days ?? []) {
        const [savedDay] = await tx
          .insert(tripDays)
          .values({
            tripId: trip.id,
            dayNumber: day.day_number,
            date: day.date || null,
            dayTitle: day.day_title || null,
          })
          .returning({ id: tripDays.id })

        const dayStops = (day.stops ?? []).map(
          (stop: Record<string, unknown>, index: number) => ({
            dayId: savedDay.id,
            tripId: trip.id,
            position: index + 1,
            placeName: String(stop.place_name ?? 'Unnamed stop'),
            category: (stop.category as string) ?? null,
            address: (stop.address as string) ?? null,
            startTime: (stop.start_time as string) ?? null,
            durationMinutes: Number(stop.duration_minutes) || 60,
            estimatedCost: String(Number(stop.estimated_cost) || 0),
            travelTimeFromPrev: Number(stop.travel_time_from_prev) || 0,
            travelMode: (stop.travel_mode as string) ?? null,
            openingHours: (stop.opening_hours as string) ?? null,
            notes: (stop.notes as string) ?? null,
          })
        )

        if (dayStops.length > 0) {
          await tx.insert(stops).values(dayStops)
        }
      }

      return trip.id
    })

    const saved = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
      with: { days: { with: { stops: true } } },
    })

    const response = NextResponse.json({
      success: true,
      trip: saved ? serializeTrip(saved, { is_owner: true }) : null,
    })

    // Geocode the destination itself, not just the individual stops.
    //
    // Nothing set trips.destination_lat/lng, so it was null on every trip ever
    // created — and TripWeather returns null without it. The weather panel was
    // therefore invisible on 100% of trips, which reads as "the feature was
    // never built" rather than "one column is empty".
    if (body.destination) {
      after(async () => {
        try {
          const outcome = await geocodeByQuery(body.destination)
          if (outcome.lat === null) return
          await db
            .update(trips)
            .set({ destinationLat: outcome.lat, destinationLng: outcome.lng })
            .where(eq(trips.id, tripId))
        } catch (err) {
          console.error('[geocode] destination geocode failed:', err)
        }
      })
    }

    return response
  } catch (error) {
    console.error('Save trip error:', error)
    return NextResponse.json({ error: 'Failed to save trip' }, { status: 500 })
  }
}

/** DELETE /api/trips?id=… — owner only. Days and stops cascade. */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tripId = new URL(request.url).searchParams.get('id')
    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID required' }, { status: 400 })
    }

    const deleted = await db
      .delete(trips)
      .where(and(eq(trips.id, tripId), eq(trips.ownerId, userId)))
      .returning({ id: trips.id })

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Trip not found, or you are not its owner' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete trip error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
