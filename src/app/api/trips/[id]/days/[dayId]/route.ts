import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gt, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { tripDays } from '@/lib/db/schema'
import { serializeDay } from '@/lib/db/serialize'
import { requireTripEditor } from '@/lib/api/guards'

export const dynamic = 'force-dynamic'

/** PATCH /api/trips/:id/days/:dayId — rename or re-date a day. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  try {
    const { id: tripId, dayId } = await params
    const guard = await requireTripEditor(tripId)
    if (!guard.ok) return guard.response

    const body = await request.json().catch(() => ({}))

    const updates: Record<string, unknown> = {}
    if (body.day_title !== undefined) updates.dayTitle = body.day_title || null
    if (body.date !== undefined) updates.date = body.date || null
    if (body.notes !== undefined) updates.notes = body.notes || null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    // The tripId in the WHERE clause is load-bearing: without it a caller
    // could edit a day belonging to someone else's trip by guessing its id.
    const [day] = await db
      .update(tripDays)
      .set(updates)
      .where(and(eq(tripDays.id, dayId), eq(tripDays.tripId, tripId)))
      .returning()

    if (!day) return NextResponse.json({ error: 'Day not found' }, { status: 404 })

    return NextResponse.json({ day: serializeDay(day) })
  } catch (error) {
    console.error('Update day error:', error)
    return NextResponse.json({ error: 'Failed to update day' }, { status: 500 })
  }
}

/** DELETE /api/trips/:id/days/:dayId — remove a day and close the numbering gap. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  try {
    const { id: tripId, dayId } = await params
    const guard = await requireTripEditor(tripId)
    if (!guard.ok) return guard.response

    const removed = await db.transaction(async (tx) => {
      const [day] = await tx
        .delete(tripDays)
        .where(and(eq(tripDays.id, dayId), eq(tripDays.tripId, tripId)))
        .returning({ dayNumber: tripDays.dayNumber })

      if (!day) return null

      // Stops cascade via the foreign key. Renumber what's left so the trip
      // doesn't read "Day 1, Day 3, Day 4".
      await tx
        .update(tripDays)
        .set({ dayNumber: sql`${tripDays.dayNumber} - 1` })
        .where(
          and(eq(tripDays.tripId, tripId), gt(tripDays.dayNumber, day.dayNumber))
        )

      return day
    })

    if (!removed) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete day error:', error)
    return NextResponse.json({ error: 'Failed to delete day' }, { status: 500 })
  }
}
