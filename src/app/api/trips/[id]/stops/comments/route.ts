import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'

import { db } from '@/lib/db'
import { stops, stopComments } from '@/lib/db/schema'
import { getTripAccess } from '@/lib/db/access'
import { getCurrentUserId } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/trips/:id/stops/comments?stop_id=xxx
 * Returns comments for a stop, newest first, with profile info.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = await params
  const { searchParams } = new URL(req.url)
  const stopId = searchParams.get('stop_id')

  if (!stopId) return NextResponse.json({ error: 'stop_id required' }, { status: 400 })

  const userId = await getCurrentUserId()
  const access = userId ? await getTripAccess(tripId, userId) : null
  if (!access?.canView) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const comments = await db.query.stopComments.findMany({
    where: eq(stopComments.stopId, stopId),
    with: { profile: true },
    orderBy: [desc(stopComments.createdAt)],
  })

  return NextResponse.json({ comments })
}

/**
 * POST /api/trips/:id/stops/comments — add a comment.
 * Any trip member can comment (viewers included — commenting is not editing).
 * Body: { stop_id, content }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = await params
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getTripAccess(tripId, userId)
  if (!access?.canView) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const body = await req.json()
  const { stop_id, content } = body

  if (!stop_id) return NextResponse.json({ error: 'stop_id required' }, { status: 400 })
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  // Verify stop belongs to this trip
  const stop = await db.query.stops.findFirst({
    where: eq(stops.id, stop_id),
    columns: { id: true, tripId: true },
  })
  if (!stop || stop.tripId !== tripId) {
    return NextResponse.json({ error: 'Stop not found in this trip' }, { status: 404 })
  }

  const [comment] = await db
    .insert(stopComments)
    .values({ stopId: stop_id, userId, content: content.trim() })
    .returning()

  return NextResponse.json({ comment }, { status: 201 })
}
