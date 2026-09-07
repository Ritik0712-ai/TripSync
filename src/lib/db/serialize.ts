/**
 * Drizzle rows -> the JSON shape the existing UI already consumes.
 *
 * Two things this handles that would otherwise cause silent bugs:
 *
 *  1. Drizzle returns camelCase keys; the pages read snake_case (`start_date`,
 *     `place_name`, `trip_days`). Rather than rewrite every component, the wire
 *     format is kept stable here.
 *
 *  2. Postgres `numeric` comes back from the driver as a *string*. The UI does
 *     arithmetic on costs (`sum + stop.estimated_cost`), so leaving them as
 *     strings would concatenate instead of add — "0500300" instead of 800.
 *     Every numeric is coerced to a real number here.
 */
import type { Stop, Trip, TripDay } from './schema'

const num = (v: string | number | null | undefined): number =>
  v === null || v === undefined ? 0 : typeof v === 'number' ? v : Number(v)

export function serializeStop(s: Stop) {
  return {
    id: s.id,
    day_id: s.dayId,
    trip_id: s.tripId,
    position: s.position,
    place_name: s.placeName,
    place_id: s.placeId,
    category: s.category,
    lat: s.lat,
    lng: s.lng,
    address: s.address,
    start_time: s.startTime,
    duration_minutes: s.durationMinutes ?? 0,
    estimated_cost: num(s.estimatedCost),
    travel_time_from_prev: s.travelTimeFromPrev ?? 0,
    travel_mode: s.travelMode,
    opening_hours: s.openingHours,
    notes: s.notes,
    is_visited: s.isVisited,
    is_skipped: s.isSkipped,
  }
}

export function serializeDay(d: TripDay & { stops?: Stop[] }) {
  return {
    id: d.id,
    trip_id: d.tripId,
    day_number: d.dayNumber,
    date: d.date,
    day_title: d.dayTitle,
    notes: d.notes,
    stops: (d.stops ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(serializeStop),
  }
}

export function serializeTrip(
  t: Trip & { days?: (TripDay & { stops?: Stop[] })[] },
  extra: { role?: string; is_owner?: boolean } = {}
) {
  return {
    id: t.id,
    owner_id: t.ownerId,
    title: t.title,
    destination: t.destination,
    destination_lat: t.destinationLat,
    destination_lng: t.destinationLng,
    start_date: t.startDate,
    end_date: t.endDate,
    budget_total: num(t.budgetTotal),
    currency: t.currency,
    travel_style: t.travelStyle,
    interests: t.interests ?? [],
    group_size: t.groupSize,
    is_public: t.isPublic,
    share_token: t.shareToken,
    status: t.status,
    created_at: t.createdAt,
    trip_days: (t.days ?? [])
      .slice()
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map(serializeDay),
    ...extra,
  }
}
