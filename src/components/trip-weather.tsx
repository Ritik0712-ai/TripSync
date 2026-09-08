'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchWeather, type DayWeather } from '@/lib/weather'
import type { Trip } from '@/types/database'

interface TripWeatherProps {
  trip: Trip
}

function WeatherBadge({ w, date }: { w: DayWeather; date: string }) {
  const d = new Date(date + 'T12:00:00')
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200 text-xs">
      <span className="text-base">{w.icon}</span>
      <div>
        <div className="font-medium text-slate-800">{dayName}</div>
        <div className="text-slate-500">
          {Math.round(w.tempLow)}–{Math.round(w.tempHigh)}°C
          {w.precipitationChance > 20 && (
            <span className="ml-1"> · {w.precipitationChance}% 🌧️</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function TripWeather({ trip }: TripWeatherProps) {
  // `null` means "not fetched yet", which is what `loading` used to track.
  // Deriving it removes a second state variable that had to be kept in sync
  // and, with it, the synchronous setState that React flags in effects.
  const [weather, setWeather] = useState<Map<string, DayWeather> | null>(null)

  const dates = useMemo(
    () =>
      (trip.trip_days ?? [])
        .map((d) => d.date)
        .filter((d): d is string => !!d),
    [trip.trip_days]
  )

  // Prefer the trip's own coordinates, but fall back to the first stop that has
  // been geocoded. Trips created before the destination was geocoded have no
  // coordinates of their own, and a forecast for the first stop of the trip is
  // the same forecast for practical purposes — they are in the same city.
  const firstGeocodedStop = useMemo(
    () =>
      (trip.trip_days ?? [])
        .flatMap((d) => d.stops ?? [])
        .find((s) => s.lat && s.lng) ?? null,
    [trip.trip_days]
  )

  const lat = trip.destination_lat ?? firstGeocodedStop?.lat ?? null
  const lng = trip.destination_lng ?? firstGeocodedStop?.lng ?? null

  useEffect(() => {
    if (!lat || !lng || !dates.length) return

    let cancelled = false

    fetchWeather(lat, lng, dates)
      .then((w) => {
        if (!cancelled) setWeather(w)
      })
      .catch(() => {
        // An empty map means "we tried and got nothing" — the section hides
        // itself rather than spinning forever.
        if (!cancelled) setWeather(new Map())
      })

    return () => {
      cancelled = true
    }
  }, [lat, lng, dates])

  if (!lat || !lng) return null
  if (!trip.trip_days?.length) return null

  const loading = weather === null && dates.length > 0
  const daysWithWeather = trip.trip_days.filter((d) => d.date && weather?.has(d.date))

  if (loading) {
    return (
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-28 bg-slate-100 rounded-full animate-pulse" />
        ))}
      </div>
    )
  }

  if (!daysWithWeather.length) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {daysWithWeather.map((d) => {
        const w = weather?.get(d.date!)
        if (!w) return null
        return <WeatherBadge key={d.id} w={w} date={d.date!} />
      })}
    </div>
  )
}
