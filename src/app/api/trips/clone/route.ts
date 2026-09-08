import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

import { db } from '@/lib/db'
import { trips, tripDays, stops, tripMembers } from '@/lib/db/schema'
import { requireTripViewer } from '@/lib/api/guards'

export const dynamic = 'force-dynamic'

/**
 * POST /api/trips/clone — clone a public trip to the current user.
 * Body: { trip_id }
 *
 * Copies the trip, all its days and stops. The clone is fully independent —
 * edits to the original do not affect it. Members, share tokens, and share_role
 * are NOT copied (the current user becomes the sole owner of the clone).
 *
 * Must be a transaction so we never have a half-cloned trip.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { trip_id } = body

  if (!trip_id) return NextResponse.json({ error: 'trip_id required' }, { status: 400 })

  // Require viewer access (public trips allow viewer access for anyone)
  const guard = await requireTripViewer(trip_id)
  if (!guard.ok) return guard.response

  // Fetch the source trip with all days and stops
  const sourceTrip = await db.query.trips.findFirst({
    where: (t, { eq }) => eq(t.id, trip_id),
    with: {
      days: {
        with: { stops: true },
        orderBy: (d, { asc }) => [asc(d.dayNumber)],
      },
    },
  })

  if (!sourceTrip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  if (!sourceTrip.isPublic && sourceTrip.ownerId !== guard.userId) {
    return NextResponse.json({ error: 'This trip is private' }, { status: 403 })
  }

  const newTripId = randomBytes(4).toString('hex')
  const newShareToken = randomBytes(8).toString('hex')

  await db.transaction(async (tx) => {
    // Insert the cloned trip
    const [clonedTrip] = await tx
      .insert(trips)
      .values({
        id: newTripId,
        ownerId: guard.userId,
        title: `${sourceTrip.title} (Copy)`,
        destination: sourceTrip.destination,
        destinationLat: sourceTrip.destinationLat,
        destinationLng: sourceTrip.destinationLng,
        startDate: sourceTrip.startDate,
        endDate: sourceTrip.endDate,
        budgetTotal: sourceTrip.budgetTotal,
        currency: sourceTrip.currency,
        travelStyle: sourceTrip.travelStyle,
        interests: sourceTrip.interests ?? [],
        groupSize: sourceTrip.groupSize,
        isPublic: false,
        shareToken: newShareToken,
        shareRole: 'viewer',
        status: 'planning',
      })
      .returning()

    // Clone each day and its stops
    for (const sourceDay of sourceTrip.days) {
      const [clonedDay] = await tx
        .insert(tripDays)
        .values({
          tripId: clonedTrip.id,
          dayNumber: sourceDay.dayNumber,
          dayTitle: sourceDay.dayTitle,
          date: sourceDay.date,
        })
        .returning()

      // Clone stops (omit lat/lng — they'll be re-geocoded when viewed)
      for (const sourceStop of sourceDay.stops) {
        await tx.insert(stops).values({
          dayId: clonedDay.id,
          tripId: clonedTrip.id,
          position: sourceStop.position,
          placeName: sourceStop.placeName,
          placeId: sourceStop.placeId,
          category: sourceStop.category,
          address: sourceStop.address,
          startTime: sourceStop.startTime,
          durationMinutes: sourceStop.durationMinutes,
          estimatedCost: sourceStop.estimatedCost,
          travelTimeFromPrev: sourceStop.travelTimeFromPrev,
          travelMode: sourceStop.travelMode,
          openingHours: sourceStop.openingHours,
          notes: sourceStop.notes,
          isVisited: false,
          isSkipped: false,
          // Do NOT copy lat/lng — geocode fresh
        })
      }
    }

    // Add the user as owner member
    await tx.insert(tripMembers).values({
      tripId: clonedTrip.id,
      userId: guard.userId,
      role: 'owner',
    })
  })

  return NextResponse.json({ trip_id: newTripId }, { status: 201 })
}
