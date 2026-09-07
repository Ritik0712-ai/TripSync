/**
 * Trip permission checks.
 *
 * This module is the replacement for the old Supabase RLS policies. Every API
 * route that touches a trip must resolve access through here first. Keeping it
 * in one file means there is exactly one definition of "can this user see /
 * edit this trip", instead of the same rule copy-pasted into six routes.
 */
import { and, eq } from 'drizzle-orm'

import { db } from './index'
import { trips, tripMembers, type TripRole } from './schema'

export interface TripAccess {
  tripId: string
  ownerId: string
  role: TripRole
  isOwner: boolean
  canView: boolean
  canEdit: boolean
}

/**
 * Resolve what `userId` is allowed to do with `tripId`.
 * Returns null when the trip does not exist or the user has no access at all.
 */
export async function getTripAccess(
  tripId: string,
  userId: string | null
): Promise<TripAccess | null> {
  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
    columns: { id: true, ownerId: true, isPublic: true },
  })

  if (!trip) return null

  if (userId && trip.ownerId === userId) {
    return {
      tripId: trip.id,
      ownerId: trip.ownerId,
      role: 'owner',
      isOwner: true,
      canView: true,
      canEdit: true,
    }
  }

  if (userId) {
    const membership = await db.query.tripMembers.findFirst({
      where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)),
      columns: { role: true },
    })

    if (membership) {
      const role = membership.role as TripRole
      return {
        tripId: trip.id,
        ownerId: trip.ownerId,
        role,
        isOwner: false,
        canView: true,
        canEdit: role === 'owner' || role === 'editor',
      }
    }
  }

  // Public trips are readable by anyone, including signed-out visitors.
  if (trip.isPublic) {
    return {
      tripId: trip.id,
      ownerId: trip.ownerId,
      role: 'viewer',
      isOwner: false,
      canView: true,
      canEdit: false,
    }
  }

  return null
}

/** True when the user may read the trip. */
export async function canViewTrip(tripId: string, userId: string | null) {
  const access = await getTripAccess(tripId, userId)
  return access?.canView === true
}

/** True when the user may modify the trip's contents. */
export async function canEditTrip(tripId: string, userId: string | null) {
  const access = await getTripAccess(tripId, userId)
  return access?.canEdit === true
}
