import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { trips } from '@/lib/db/schema'
import { serializeTrip } from '@/lib/db/serialize'

export const dynamic = 'force-dynamic'

/**
 * GET /api/trips/public — list all public trips.
 * Query params:
 *   q — search by destination (simple ILIKE)
 *   limit — max results (default 20)
 *
 * No auth required — anyone can browse public templates.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50)

  try {
    const results = await db.query.trips.findMany({
      where: (t, { and, eq, ilike }) => {
        if (!q) return eq(t.isPublic, true)
        return and(eq(t.isPublic, true), ilike(t.destination, `%${q}%`))
      },
      with: {
        days: {
          orderBy: (d, { asc }) => [asc(d.dayNumber)],
        },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit,
    })

    const serialized = results.map((t) =>
      serializeTrip(t, { role: 'viewer', is_owner: false })
    )

    return NextResponse.json({ trips: serialized })
  } catch (err) {
    console.error('[public-trips]', err)
    return NextResponse.json({ error: 'Failed to load trips' }, { status: 500 })
  }
}
