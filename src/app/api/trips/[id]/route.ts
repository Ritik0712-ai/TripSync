import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { trips } from '@/lib/db/schema'
import { serializeTrip } from '@/lib/db/serialize'
import { getTripAccess } from '@/lib/db/access'
import { getCurrentUserId } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/trips/:id
 *
 * Readable by the owner, any invited member, or anyone at all if the trip is
 * public. The previous version required owner_id to match, so a collaborator
 * who accepted an invite still got a 404.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getCurrentUserId()

    const access = await getTripAccess(id, userId)
    if (!access?.canView) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, id),
      with: { days: { with: { stops: true } } },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    return NextResponse.json({
      trip: serializeTrip(trip, {
        role: access.role,
        is_owner: access.isOwner,
      }),
    })
  } catch (error) {
    console.error('Get trip error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PATCH /api/trips/:id — owner or editor. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await getTripAccess(id, userId)
    if (!access?.canView) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    if (!access.canEdit) {
      return NextResponse.json(
        { error: 'You only have view access to this trip' },
        { status: 403 }
      )
    }

    const body = await request.json()

    if (body.status && !['planning', 'active', 'completed'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Only apply the fields actually present in the request body, so a partial
    // update can't blank out columns the caller didn't mention.
    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.destination !== undefined) updates.destination = body.destination
    if (body.startDate !== undefined) updates.startDate = body.startDate || null
    if (body.endDate !== undefined) updates.endDate = body.endDate || null
    if (body.budgetTotal !== undefined) updates.budgetTotal = String(body.budgetTotal)
    if (body.currency !== undefined) updates.currency = body.currency
    if (body.travelStyle !== undefined) updates.travelStyle = body.travelStyle
    if (body.interests !== undefined) updates.interests = body.interests
    if (body.groupSize !== undefined) updates.groupSize = Number(body.groupSize) || 1
    if (body.status !== undefined) updates.status = body.status
    if (body.isPublic !== undefined) updates.isPublic = Boolean(body.isPublic)
    if (body.shareRole !== undefined) {
      if (!['viewer', 'editor'].includes(body.shareRole)) {
        return NextResponse.json(
          { error: 'shareRole must be viewer or editor' },
          { status: 400 }
        )
      }
      updates.shareRole = body.shareRole
    }

    if (updates.shareRole !== undefined && !access.isOwner) {
      return NextResponse.json(
        { error: 'Only the trip owner can change what the share link grants' },
        { status: 403 }
      )
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const [updated] = await db
      .update(trips)
      .set(updates)
      .where(eq(trips.id, id))
      .returning()

    return NextResponse.json({ success: true, trip: serializeTrip(updated) })
  } catch (error) {
    console.error('Update trip error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
