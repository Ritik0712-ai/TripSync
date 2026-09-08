import { NextRequest, NextResponse } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { stops, stopVotes } from '@/lib/db/schema'
import { serializeStop } from '@/lib/db/serialize'
import { getTripAccess } from '@/lib/db/access'
import { getCurrentUserId } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/trips/:id/stops/votes?stop_id=xxx
 * Returns vote counts for a stop (anyone who can view the trip can see votes).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = await params
  const { searchParams } = new URL(req.url)
  const stopId = searchParams.get('stop_id')

  if (!stopId) return NextResponse.json({ error: 'stop_id required' }, { status: 400 })

  const userId = await getCurrentUserId()
  const access = userId ? await getTripAccess(tripId, userId) : null
  if (!access?.canView) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const result = await db.query.stops.findFirst({
    where: eq(stops.id, stopId),
    with: { votes: true },
  })

  if (!result) return NextResponse.json({ error: 'Stop not found' }, { status: 404 })

  const upvotes = result.votes.filter((v) => v.vote === 1).length
  const downvotes = result.votes.filter((v) => v.vote === -1).length
  const userVote = result.votes.find((v) => v.userId === userId)?.vote ?? null

  return NextResponse.json({ upvotes, downvotes, user_vote: userVote })
}

/**
 * POST /api/trips/:id/stops/votes — cast or toggle a vote.
 * Body: { stop_id, vote: 1 | -1 | 0 }
 * vote=0 removes the vote (toggle-off). Any signed-in user on the trip can vote.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = await params
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getTripAccess(tripId, userId)
  if (!access?.canView) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const body = await req.json()
  const { stop_id, vote } = body

  if (!stop_id) return NextResponse.json({ error: 'stop_id required' }, { status: 400 })
  if (![1, -1, 0].includes(vote)) {
    return NextResponse.json({ error: 'vote must be 1, -1, or 0' }, { status: 400 })
  }

  // Verify stop belongs to this trip
  const stop = await db.query.stops.findFirst({
    where: eq(stops.id, stop_id),
    columns: { id: true, tripId: true },
  })
  if (!stop || stop.tripId !== tripId) {
    return NextResponse.json({ error: 'Stop not found in this trip' }, { status: 404 })
  }

  if (vote === 0) {
    // Remove vote
    await db
      .delete(stopVotes)
      .where(and(eq(stopVotes.stopId, stop_id), eq(stopVotes.userId, userId)))
  } else {
    // Upsert vote
    await db
      .insert(stopVotes)
      .values({ stopId: stop_id, userId, vote })
      .onConflictDoUpdate({ target: [stopVotes.stopId, stopVotes.userId], set: { vote } })
  }

  return NextResponse.json({ success: true })
}
