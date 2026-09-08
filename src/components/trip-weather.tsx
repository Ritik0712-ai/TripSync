'use client'

import { useEffect, useState } from 'react'
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
  const [weather, setWeather] = useState<Map<string, DayWeather>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!trip.destination_lat || !trip.destination_lng) return
    if (!trip.trip_days?.length) return

    const dates = trip.trip_days
      .map((d) => d.date)
      .filter((d): d is string => !!d)

    if (!dates.length) return

    setLoading(true)
    fetchWeather(trip.destination_lat, trip.destination_lng, dates).then((w) => {
      setWeather(w)
      setLoading(false)
    })
  }, [trip.destination_lat, trip.destination_lng, trip.trip_days])

  if (!trip.destination_lat || !trip.destination_lng) return null
  if (!trip.trip_days?.length) return null

  const daysWithWeather = trip.trip_days.filter((d) => d.date && weather.has(d.date!))

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
        const w = weather.get(d.date!)
        if (!w) return null
        return <WeatherBadge key={d.id} w={w} date={d.date!} />
      })}
    </div>
  )
}
