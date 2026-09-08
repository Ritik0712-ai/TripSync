import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'

import { db } from '@/lib/db'
import { stops, stopComments } from '@/lib/db/schema'
import { getTripAccess } from '@/lib/db/access'
import { getCurrentUserId } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/trips/:id/stops/comments/:commentId
 * Only the comment author can delete their own comment.
 * Editors and owners can delete any comment on a trip they own.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id: tripId, commentId } = await params
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getTripAccess(tripId, userId)
  if (!access?.canView) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  // Look up the comment and verify it belongs to a stop on this trip.
  // We do the stop+trip join in-app rather than adding a relation for this one case.
  const comment = await db.query.stopComments.findFirst({
    where: eq(stopComments.id, commentId),
    columns: { id: true, userId: true },
  })
  if (!comment) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
  }

  // Delete is allowed if: user wrote it, OR they are the trip owner.
  if (comment.userId !== userId && !access.isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.delete(stopComments).where(eq(stopComments.id, commentId))

  return NextResponse.json({ success: true })
}
