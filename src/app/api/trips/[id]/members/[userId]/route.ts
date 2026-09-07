import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { trips, tripMembers } from '@/lib/db/schema'
import { getCurrentUserId } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/** DELETE — owner can remove anyone; a member can remove themselves (leave). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: tripId, userId: targetUserId } = await params
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

    const isOwner = trip.ownerId === userId
    const isSelfRemoval = userId === targetUserId

    if (!isOwner && !isSelfRemoval) {
      return NextResponse.json(
        { error: 'Only the owner can remove other members' },
        { status: 403 }
      )
    }
    if (targetUserId === trip.ownerId) {
      return NextResponse.json(
        { error: 'The trip owner cannot be removed' },
        { status: 400 }
      )
    }

    const removed = await db
      .delete(tripMembers)
      .where(
        and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, targetUserId))
      )
      .returning({ userId: tripMembers.userId })

    if (removed.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PATCH — change a member's role. Owner only. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: tripId, userId: targetUserId } = await params
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
        { error: 'Only the owner can change member roles' },
        { status: 403 }
      )
    }
    if (targetUserId === trip.ownerId) {
      return NextResponse.json(
        { error: "The owner's role cannot be changed" },
        { status: 400 }
      )
    }

    const { role } = await request.json()
    if (!role || !['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be editor or viewer' },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(tripMembers)
      .set({ role })
      .where(
        and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, targetUserId))
      )
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({
      member: {
        trip_id: updated.tripId,
        user_id: updated.userId,
        role: updated.role,
        joined_at: updated.joinedAt,
      },
    })
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
