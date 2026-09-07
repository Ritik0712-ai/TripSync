/**
 * Shared request guards for the trip API.
 *
 * Every mutating route needs the same three checks in the same order:
 * signed in, trip visible, trip editable. Duplicating that across a dozen
 * handlers is how the permission model drifts, so it lives here once.
 */
import { NextResponse } from 'next/server'

import { getCurrentUserId } from '@/lib/auth/server'
import { getTripAccess, type TripAccess } from '@/lib/db/access'

type Guard =
  | { ok: true; userId: string; access: TripAccess }
  | { ok: false; response: NextResponse }

const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const notFound = () => NextResponse.json({ error: 'Trip not found' }, { status: 404 })

const forbidden = (message: string) =>
  NextResponse.json({ error: message }, { status: 403 })

/** Signed in, and allowed to read this trip. */
export async function requireTripViewer(tripId: string): Promise<Guard> {
  const userId = await getCurrentUserId()
  if (!userId) return { ok: false, response: unauthorized() }

  const access = await getTripAccess(tripId, userId)
  // A trip the user cannot see is reported as missing rather than forbidden,
  // so the API doesn't confirm the existence of other people's trips.
  if (!access?.canView) return { ok: false, response: notFound() }

  return { ok: true, userId, access }
}

/** Signed in, and allowed to modify this trip's contents. */
export async function requireTripEditor(tripId: string): Promise<Guard> {
  const guard = await requireTripViewer(tripId)
  if (!guard.ok) return guard

  if (!guard.access.canEdit) {
    return {
      ok: false,
      response: forbidden('You only have view access to this trip'),
    }
  }

  return guard
}
