'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Copy, MapPin, Calendar, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Trip } from '@/types/database'

export default function PublicTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [cloning, setCloning] = useState<string | null>(null)
  const router = useRouter()

  const loadTrips = async (search = '') => {
    setLoading(true)
    try {
      const url = search
        ? `/api/trips/public?q=${encodeURIComponent(search)}`
        : '/api/trips/public'
      const res = await fetch(url)
      const data = await res.json()
      setTrips(data.trips ?? [])
    } catch {
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial load only — searching calls loadTrips directly from the form.
    void (async () => {
      await loadTrips()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadTrips(query)
  }

  const handleClone = async (tripId: string) => {
    setCloning(tripId)
    try {
      const res = await fetch('/api/trips/clone', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId }),
      })
      // This page is now reachable signed out, so cloning is the first thing
      // that actually needs an account. Send them to sign in and bring them
      // back here rather than showing a bare "Unauthorized".
      if (res.status === 401) {
        router.push(`/login?redirectTo=${encodeURIComponent('/trips/public')}`)
        return
      }

      const data = await res.json()
      if (res.ok && data.trip_id) {
        router.push(`/trip/${data.trip_id}`)
      } else {
        alert(data.error ?? 'Could not clone trip')
      }
    } finally {
      setCloning(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Browse Trip Templates</h1>
        <p className="text-muted-foreground">
          Discover public trips and copy them as a starting point for your own adventure.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by destination…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {query ? `No public trips found for "${query}"` : 'No public trips yet. Be the first to share one!'}
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <div key={trip.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg truncate">{trip.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                    {trip.destination && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {trip.destination}
                      </span>
                    )}
                    {trip.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {trip.start_date}
                      </span>
                    )}
                    {trip.group_size > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {trip.group_size} {trip.group_size === 1 ? 'traveller' : 'travellers'}
                      </span>
                    )}
                    {trip.trip_days && (
                      <span>{trip.trip_days.length} day{trip.trip_days.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {trip.interests && trip.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {trip.interests.slice(0, 5).map((interest) => (
                        <span key={interest} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/trip/${trip.id}`}>
                    <Button variant="outline" size="sm">Preview</Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => handleClone(trip.id)}
                    disabled={cloning === trip.id}
                  >
                    {cloning === trip.id ? 'Cloning…' : (
                      <><Copy className="w-3 h-3 mr-1" /> Use as template</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
