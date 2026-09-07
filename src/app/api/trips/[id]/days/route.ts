import { NextRequest, NextResponse } from 'next/server'
import { eq, max } from 'drizzle-orm'

import { db } from '@/lib/db'
import { tripDays } from '@/lib/db/schema'
import { serializeDay } from '@/lib/db/serialize'
import { requireTripEditor } from '@/lib/api/guards'

export const dynamic = 'force-dynamic'

/** POST /api/trips/:id/days — append a day to the trip. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params
    const guard = await requireTripEditor(tripId)
    if (!guard.ok) return guard.response

    const body = await request.json().catch(() => ({}))

    // Day numbers are append-only here; gaps are closed on delete instead.
    const [{ highest }] = await db
      .select({ highest: max(tripDays.dayNumber) })
      .from(tripDays)
      .where(eq(tripDays.tripId, tripId))

    const [day] = await db
      .insert(tripDays)
      .values({
        tripId,
        dayNumber: (highest ?? 0) + 1,
        date: body.date || null,
        dayTitle: body.day_title || null,
        notes: body.notes || null,
      })
      .returning()

    return NextResponse.json({ day: serializeDay(day) }, { status: 201 })
  } catch (error) {
    console.error('Create day error:', error)
    return NextResponse.json({ error: 'Failed to create day' }, { status: 500 })
  }
}
