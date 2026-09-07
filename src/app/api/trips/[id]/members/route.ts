import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq, ilike } from 'drizzle-orm'

import { db } from '@/lib/db'
import { trips, tripMembers } from '@/lib/db/schema'
import { authUsers } from '@/lib/db/auth-schema'
import { getTripAccess } from '@/lib/db/access'
import { getCurrentUserId } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/** Shape the members UI expects (kept from the original Supabase response). */
function toMember(row: {
  tripId: string
  userId: string
  role: string
  joinedAt: Date | null
  name: string | null
  email: string | null
  image: string | null
}) {
  return {
    trip_id: row.tripId,
    user_id: row.userId,
    role: row.role,
    joined_at: row.joinedAt,
    profiles: {
      id: row.userId,
      full_name: row.name,
      username: row.email,
      avatar_url: row.image,
    },
  }
}

/** GET /api/trips/:id/members — owner first, then members by join date. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await getTripAccess(tripId, userId)
    if (!access?.canView) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const rows = await db
      .select({
        tripId: tripMembers.tripId,
        userId: tripMembers.userId,
        role: tripMembers.role,
        joinedAt: tripMembers.joinedAt,
        name: authUsers.name,
        email: authUsers.email,
        image: authUsers.image,
      })
      .from(tripMembers)
      .leftJoin(authUsers, eq(authUsers.id, tripMembers.userId))
      .where(eq(tripMembers.tripId, tripId))
      .orderBy(asc(tripMembers.joinedAt))

    const [owner] = await db
      .select({
        id: authUsers.id,
        name: authUsers.name,
        email: authUsers.email,
        image: authUsers.image,
      })
      .from(authUsers)
      .where(eq(authUsers.id, access.ownerId))
      .limit(1)

    const ownerMember = owner
      ? toMember({
          tripId,
          userId: owner.id,
          role: 'owner',
          joinedAt: null,
          name: owner.name,
          email: owner.email,
          image: owner.image,
        })
      : null

    return NextResponse.json({
      members: [...(ownerMember ? [ownerMember] : []), ...rows.map(toMember)],
    })
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/trips/:id/members — invite by email. Owner only.
 *
 * This finally works: the old code looked up `profiles.email`, but the profiles
 * table had no email column, so every invite failed. Emails live in
 * neon_auth.user now.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
      columns: { id: true, ownerId: true },
    })
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    if (trip.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only the trip owner can add members' },
        { status: 403 }
      )
    }

    const { email, role = 'editor' } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (!['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be editor or viewer' },
        { status: 400 }
      )
    }

    const [target] = await db
      .select({
        id: authUsers.id,
        name: authUsers.name,
        email: authUsers.email,
        image: authUsers.image,
      })
      .from(authUsers)
      .where(ilike(authUsers.email, email.trim()))
      .limit(1)

    if (!target) {
      return NextResponse.json(
        { error: 'No TripSync account found with that email' },
        { status: 404 }
      )
    }
    if (target.id === trip.ownerId) {
      return NextResponse.json(
        { error: 'That user is already the owner' },
        { status: 400 }
      )
    }

    const existing = await db.query.tripMembers.findFirst({
      where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, target.id)),
    })
    if (existing) {
      return NextResponse.json(
        { error: 'That user is already a member' },
        { status: 409 }
      )
    }

    const [member] = await db
      .insert(tripMembers)
      .values({ tripId, userId: target.id, role })
      .returning()

    return NextResponse.json(
      {
        member: toMember({
          tripId: member.tripId,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          name: target.name,
          email: target.email,
          image: target.image,
        }),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Add member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
