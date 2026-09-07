import type { Stop } from '@/types/database'

/**
 * A Google Maps link for a stop.
 *
 * Coordinates are used when present, but the text query is a real fallback
 * rather than a degraded one: Maps resolves "Amber Fort, Jaipur" perfectly
 * well. That matters because stops added by hand have no lat/lng until
 * geocoding lands, and a button that only works for AI-generated stops would
 * be worse than no button.
 */
export function mapsUrlForStop(stop: Pick<Stop, 'place_name' | 'address' | 'lat' | 'lng'>) {
  if (typeof stop.lat === 'number' && typeof stop.lng === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`
  }

  const query = [stop.place_name, stop.address].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** A Maps link covering a whole day, as a multi-stop route. */
export function mapsUrlForDay(stops: Pick<Stop, 'place_name' | 'address' | 'lat' | 'lng'>[]) {
  const points = stops.map((s) =>
    typeof s.lat === 'number' && typeof s.lng === 'number'
      ? `${s.lat},${s.lng}`
      : [s.place_name, s.address].filter(Boolean).join(', ')
  )

  if (points.length === 0) return null
  if (points.length === 1) return mapsUrlForStop(stops[0])

  const origin = encodeURIComponent(points[0])
  const destination = encodeURIComponent(points[points.length - 1])
  const waypoints = points.slice(1, -1).map(encodeURIComponent).join('|')

  return (
    `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}` +
    (waypoints ? `&waypoints=${waypoints}` : '')
  )
}
