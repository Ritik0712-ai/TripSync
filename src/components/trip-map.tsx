'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Marker, Polyline } from 'leaflet'

// Leaflet ships its own stylesheet and does not work without it. Skipping this
// import does not throw — the map "renders", but every tile is stacked at the
// same position with no size, the zoom control loses its buttons and shows as
// a bare "+ −", and the attribution collapses into the word "Leaflet" on an
// empty panel. That is the entire symptom: a blank box with "+ − Leaflet".
import 'leaflet/dist/leaflet.css'

import type { Stop } from '@/types/database'

// ---------------------------------------------------------------------------
// Colour palette for day polylines.  Enough for a 2-week trip.
// ---------------------------------------------------------------------------
const DAY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#a855f7', // purple
  '#eab308', // yellow
  '#22c55e', // green
]

function dayColor(index: number): string {
  return DAY_COLORS[index % DAY_COLORS.length]
}

// ---------------------------------------------------------------------------
// Custom numbered marker
// ---------------------------------------------------------------------------
function createNumberedIcon(
  L: typeof import('leaflet'),
  number: number,
  isSelected: boolean,
  color: string
) {
  const bg = isSelected ? color : '#64748b'
  const textColor = isSelected ? '#ffffff' : '#ffffff'

  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${bg};border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;color:${textColor};
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      cursor:pointer;
    ">${number}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

// ---------------------------------------------------------------------------
// The inner component — only rendered after dynamic() strips SSR
// ---------------------------------------------------------------------------
function TripMapInner({
  stops,
  dayIndex,
  onStopClick,
}: {
  stops: Stop[]
  dayIndex: number
  onStopClick?: (stop: Stop) => void
}) {
  const mapRef = useRef<LeafletMap | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Marker[]>([])
  const polylinesRef = useRef<Polyline[]>([])

  // ---------------------------------------------------------------------------
  // Initialise Leaflet once
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mapRef.current) return // already initialised

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet')

    // Fix default icon paths that break in bundlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(L.Icon.Default.prototype as any)._getIconUrl = undefined
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })

    mapRef.current = L.map(containerRef.current!, {
      zoomControl: true,
      scrollWheelZoom: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current)

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
    // Only initialise once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Update markers and polylines when stops or selected day changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet')

    // Remove old markers and polylines
    polylinesRef.current.forEach((p) => p.remove())
    markersRef.current.forEach((m) => m.remove())
    polylinesRef.current = []
    markersRef.current = []

    // Partition stops: geocoded (with coords) and not
    const geocoded = stops.filter(
      (s) => typeof s.lat === 'number' && typeof s.lng === 'number'
    )
    const ungeocodedCount = stops.length - geocoded.length

    if (ungeocodedCount > 0) {
      console.warn(
        `[trip-map] ${ungeocodedCount}/${stops.length} stops have no coordinates — omitted from map`
      )
    }

    if (geocoded.length === 0) return

    const color = dayColor(dayIndex)

    // Polyline connecting all stops in the selected day
    if (geocoded.length >= 2) {
      const coords: [number, number][] = geocoded.map((s) => [s.lat!, s.lng!])
      const polyline = L.polyline(coords, {
        color,
        weight: 3,
        opacity: 0.8,
      })
        .bindPopup(`<b>Day ${dayIndex + 1}</b> — ${geocoded.length} stops`)
        .addTo(map)
      polylinesRef.current.push(polyline)
    }

    // Build numbered markers
    const numberedStops = geocoded.map((stop, idx) => ({
      stop,
      number: idx + 1,
      color,
    }))

    for (const { stop, number, color } of numberedStops) {
      const marker = L.marker([stop.lat!, stop.lng!], {
        icon: createNumberedIcon(L, number, false, color),
      })

      marker.bindPopup(
        `<b>${number}. ${stop.place_name}</b>` +
          (stop.address ? `<br/><small>${stop.address}</small>` : '') +
          (stop.start_time
            ? `<br/><small>${String(stop.start_time).slice(0, 5)}</small>`
            : '')
      )

      if (onStopClick) {
        marker.on('click', () => onStopClick(stop))
      }

      marker.addTo(map)
      markersRef.current.push(marker)
    }

    // Fit map to markers
    if (geocoded.length === 1) {
      map.setView([geocoded[0].lat!, geocoded[0].lng!], 13)
    } else {
      const group = L.featureGroup(markersRef.current)
      map.fitBounds(group.getBounds().pad(0.15))
    }
  }, [stops, dayIndex, onStopClick])

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Graceful degradation notice — shown when there are no geocoded stops
// ---------------------------------------------------------------------------
export function TripMapPlaceholder({
  totalStops,
  geocodedStops,
}: {
  totalStops: number
  geocodedStops: number
}) {
  const missing = totalStops - geocodedStops
  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg">
      <div className="text-center space-y-1 px-6">
        <p className="text-sm text-slate-500">
          No coordinates yet for this day.
        </p>
        {missing > 0 && (
          <p className="text-xs text-slate-400">
            {missing} stop{missing !== 1 ? 's' : ''} still geocoding.
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SSR-safe default export
// ---------------------------------------------------------------------------
export { TripMapInner as TripMap }

export default TripMapInner
