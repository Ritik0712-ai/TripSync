import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { trips, tripMembers } from '@/lib/db/schema'
import { authUsers } from '@/lib/db/auth-schema'
import { getCurrentUserId } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/** GET /api/trips/join?token=… — preview a trip before joining. No auth needed. */
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const [row] = await db
      .select({
        id: trips.id,
        title: trips.title,
        destination: trips.destination,
        startDate: trips.startDate,
        endDate: trips.endDate,
        ownerId: trips.ownerId,
        ownerName: authUsers.name,
        ownerImage: authUsers.image,
      })
      .from(trips)
      .leftJoin(authUsers, eq(authUsers.id, trips.ownerId))
      .where(eq(trips.shareToken, token))
      .limit(1)

    if (!row) {
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      trip: {
        id: row.id,
        title: row.title,
        destination: row.destination,
        startDate: row.startDate,
        endDate: row.endDate,
        owner: row.ownerName
          ? { id: row.ownerId, full_name: row.ownerName, avatar_url: row.ownerImage }
          : null,
      },
    })
  } catch (error) {
    console.error('Validate token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/trips/join — accept a share link and become an editor. */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 })
    }

    const trip = await db.query.trips.findFirst({
      where: eq(trips.shareToken, token),
      columns: { id: true, ownerId: true, title: true },
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 404 }
      )
    }

    if (trip.ownerId === userId) {
      return NextResponse.json({
        alreadyMember: true,
        role: 'owner',
        trip: { id: trip.id, title: trip.title },
      })
    }

    const existing = await db.query.tripMembers.findFirst({
      where: and(eq(tripMembers.tripId, trip.id), eq(tripMembers.userId, userId)),
      columns: { role: true },
    })

    if (existing) {
      return NextResponse.json({
        alreadyMember: true,
        role: existing.role,
        trip: { id: trip.id, title: trip.title },
      })
    }

    const [member] = await db
      .insert(tripMembers)
      .values({ tripId: trip.id, userId, role: 'editor' })
      .returning()

    return NextResponse.json(
      {
        success: true,
        member: { ...member, trip_id: member.tripId, user_id: member.userId },
        trip: { id: trip.id, title: trip.title },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Join trip error:', error)
    return NextResponse.json({ error: 'Failed to join trip' }, { status: 500 })
  }
}
