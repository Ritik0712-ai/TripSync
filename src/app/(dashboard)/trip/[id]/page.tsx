'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Calendar, Users, Clock, Edit, Utensils,
  Camera, ShoppingBag, Building, Car, Mountain, ExternalLink,
  Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X, Loader2,
} from 'lucide-react'

import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { TripShareDialog } from '@/components/trip-share-dialog'
import { TripMembersList } from '@/components/trip-members-list'
import { StopFormDialog } from '@/components/stop-form-dialog'
import { TripSettingsDialog } from '@/components/trip-settings-dialog'
import { mapsUrlForStop, mapsUrlForDay } from '@/lib/maps'

const TripMap = dynamic(() => import('@/components/trip-map').then((m) => m.TripMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-lg" />,
})

const TripMapPlaceholder = dynamic(
  () => import('@/components/trip-map').then((m) => m.TripMapPlaceholder),
  { ssr: false }
)
import type { Stop, Trip, TripDay } from '@/types/database'

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AUD: 'A$',
  SGD: 'S$', THB: '฿', MYR: 'RM', IDR: 'Rp', JPY: '¥',
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Camera; color: string }> = {
  food: { icon: Utensils, color: 'bg-orange-100 text-orange-700' },
  attraction: { icon: Camera, color: 'bg-blue-100 text-blue-700' },
  shopping: { icon: ShoppingBag, color: 'bg-pink-100 text-pink-700' },
  hotel: { icon: Building, color: 'bg-purple-100 text-purple-700' },
  transport: { icon: Car, color: 'bg-gray-100 text-gray-700' },
  activity: { icon: Mountain, color: 'bg-green-100 text-green-700' },
}

export default function TripDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(0)
  // Mobile: which panel is visible (itinerary or map). Desktop always shows both.
  const [mobileTab, setMobileTab] = useState<'itinerary' | 'map'>('itinerary')

  const [editMode, setEditMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [editingStop, setEditingStop] = useState<Stop | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [titleDraft, setTitleDraft] = useState<string | null>(null)

  const loadTrip = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}`)
      const data = await response.json()
      if (data.trip) setTrip(data.trip)
      else router.push('/dashboard')
    } catch (err) {
      console.error('Error fetching trip:', err)
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [tripId, router])

  useEffect(() => {
    if (!tripId) return
    authClient.getSession().then(({ data }) => setCurrentUserId(data?.user?.id ?? null))
    loadTrip()
  }, [tripId, loadTrip])

  const isOwner = trip ? (trip.is_owner ?? trip.owner_id === currentUserId) : false
  const canEdit = isOwner || trip?.role === 'editor'
  const symbol = CURRENCY_SYMBOLS[trip?.currency || 'INR'] || '₹'
  const days = trip?.trip_days ?? []
  const day: TripDay | undefined = days[selectedDay]

  const totalCost = days.reduce(
    (sum, d) => sum + (d.stops?.reduce((s, x) => s + (x.estimated_cost || 0), 0) || 0),
    0
  )
  const dayCost = (d: TripDay) =>
    d.stops?.reduce((sum, s) => sum + (s.estimated_cost || 0), 0) || 0

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString('en-US', {
          weekday: 'long', month: 'short', day: 'numeric',
        })
      : ''

  /** Every mutation funnels through here so errors surface consistently. */
  const mutate = async (input: string, init: RequestInit, failure: string) => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(input, init)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || failure)
      await loadTrip()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : failure)
      return false
    } finally {
      setBusy(false)
    }
  }

  /**
   * Move a stop one place up or down.
   *
   * The reorder endpoint requires the complete arrangement for any day it
   * touches — an omitted stop would keep its old position and collide with a
   * newly assigned one — so the whole day is sent, not just the pair that
   * swapped.
   */
  const moveStop = async (d: TripDay, index: number, direction: -1 | 1) => {
    const ids = (d.stops ?? []).map((s) => s.id)
    const target = index + direction
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]

    await mutate(
      `/api/trips/${tripId}/stops/reorder`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ days: [{ day_id: d.id, stop_ids: ids }] }),
      },
      'Could not reorder the stops'
    )
  }

  const deleteStop = async (stop: Stop) => {
    if (!confirm(`Remove "${stop.place_name}" from this day?`)) return
    await mutate(
      `/api/trips/${tripId}/stops/${stop.id}`,
      { method: 'DELETE' },
      'Could not delete the stop'
    )
  }

  const addDay = async () => {
    const ok = await mutate(
      `/api/trips/${tripId}/days`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ day_title: `Day ${days.length + 1}` }),
      },
      'Could not add a day'
    )
    if (ok) setSelectedDay(days.length)
  }

  const deleteDay = async (d: TripDay) => {
    if (!confirm(`Delete day ${d.day_number} and everything on it?`)) return
    const ok = await mutate(
      `/api/trips/${tripId}/days/${d.id}`,
      { method: 'DELETE' },
      'Could not delete the day'
    )
    if (ok) setSelectedDay((i) => Math.max(0, Math.min(i, days.length - 2)))
  }

  const saveDayTitle = async (d: TripDay) => {
    if (titleDraft === null) return
    await mutate(
      `/api/trips/${tripId}/days/${d.id}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ day_title: titleDraft }),
      },
      'Could not rename the day'
    )
    setTitleDraft(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">Trip not found</p>
        <Link href="/dashboard">
          <Button className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const dayMapsUrl = day?.stops?.length ? mapsUrlForDay(day.stops) : null

  return (
    <div className="space-y-6">
      <Link href="/dashboard">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </Link>

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} aria-label="Dismiss">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-white/20 text-white">{trip.status}</Badge>
                {trip.role && trip.role !== 'owner' && (
                  <Badge className="bg-white/20 text-white capitalize">{trip.role}</Badge>
                )}
                {trip.is_public && (
                  <Badge className="bg-white/20 text-white">Public link on</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2">{trip.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-blue-100">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {trip.destination}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {trip.group_size} {trip.group_size === 1 ? 'traveller' : 'travellers'}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              {canEdit && (
                <Button
                  variant={editMode ? 'default' : 'secondary'}
                  size="sm"
                  className="gap-2"
                  onClick={() => setEditMode((v) => !v)}
                >
                  {editMode ? <Check className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  {editMode ? 'Done' : 'Edit'}
                </Button>
              )}
              <TripShareDialog
                trip={trip as never}
                currentUserId={currentUserId ?? ''}
                isOwner={isOwner}
                onMembersUpdate={loadTrip}
              />
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">
                {symbol}{(trip.budget_total || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estimated Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                {symbol}{totalCost.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className={`text-2xl font-bold ${
                (trip.budget_total || 0) - totalCost < 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {symbol}{((trip.budget_total || 0) - totalCost).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Stops</p>
              <p className="text-2xl font-bold text-gray-900">
                {days.reduce((sum, d) => sum + (d.stops?.length || 0), 0)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Budget Used</span>
              <span>{Math.round((totalCost / (trip.budget_total || 1)) * 100)}%</span>
            </div>
            <Progress
              value={Math.min(100, (totalCost / (trip.budget_total || 1)) * 100)}
              className="h-2"
            />
          </div>

          {trip.interests?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {trip.interests.map((interest) => (
                <Badge key={interest} variant="secondary">{interest}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-2 items-center">
        {days.map((d, index) => (
          <button
            key={d.id}
            onClick={() => setSelectedDay(index)}
            className={`px-4 py-3 rounded-lg font-medium whitespace-nowrap transition-all flex flex-col items-center min-w-[100px] ${
              selectedDay === index
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border'
            }`}
          >
            <span>Day {d.day_number}</span>
            <span className={`text-xs ${selectedDay === index ? 'text-blue-100' : 'text-gray-500'}`}>
              {d.date
                ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'}
            </span>
          </button>
        ))}

        {editMode && (
          <Button variant="outline" className="gap-2 shrink-0" onClick={addDay} disabled={busy}>
            <Plus className="w-4 h-4" />
            Add day
          </Button>
        )}
      </div>

      {/* Mobile: itinerary / map tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg lg:hidden">
        <button
          onClick={() => setMobileTab('itinerary')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            mobileTab === 'itinerary' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
          }`}
        >
          Itinerary
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            mobileTab === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
          }`}
        >
          Map
        </button>
      </div>

      {/* Desktop split: itinerary left, map right */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6 items-start">
        {/* Itinerary column */}
        <div>
          {day && (
            <Card>
              <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {editMode && titleDraft !== null ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      className="max-w-sm"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => saveDayTitle(day)} disabled={busy}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setTitleDraft(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <CardTitle className="text-xl flex items-center gap-2">
                    {day.day_title || `Day ${day.day_number}`}
                    {editMode && (
                      <button
                        onClick={() => setTitleDraft(day.day_title || '')}
                        className="text-gray-400 hover:text-gray-700"
                        aria-label="Rename day"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </CardTitle>
                )}
                <CardDescription>{formatDate(day.date)}</CardDescription>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm text-gray-500">Day Total</p>
                <p className="text-lg font-bold">
                  {symbol}{dayCost(day).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-3">
              {dayMapsUrl && (
                <a href={dayMapsUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Open day in Maps
                  </Button>
                </a>
              )}
              {editMode && (
                <>
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={busy}
                    onClick={() => { setEditingStop(null); setStopDialogOpen(true) }}
                  >
                    <Plus className="w-4 h-4" />
                    Add stop
                  </Button>
                  {days.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 hover:text-red-700"
                      onClick={() => deleteDay(day)}
                      disabled={busy}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete day
                    </Button>
                  )}
                </>
              )}
              {busy && <Loader2 className="w-4 h-4 animate-spin text-gray-400 self-center" />}
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {!day.stops?.length ? (
                <p className="text-gray-500 text-center py-8">
                  {editMode ? 'No stops yet — add the first one.' : 'No stops planned for this day'}
                </p>
              ) : (
                day.stops.map((stop, index) => {
                  const config = CATEGORY_CONFIG[stop.category ?? ''] ?? CATEGORY_CONFIG.attraction
                  const CategoryIcon = config.icon

                  return (
                    <div key={stop.id} className="relative">
                      {index < day.stops.length - 1 && (
                        <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gray-200" />
                      )}

                      <div className="flex gap-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
                            <CategoryIcon className="w-5 h-5" />
                          </div>
                          {stop.travel_time_from_prev > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Car className="w-3 h-3" />
                              <span>{stop.travel_time_from_prev}m</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{stop.place_name}</h4>
                              {stop.address && (
                                <p className="text-sm text-gray-500">{stop.address}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-gray-900">
                                {symbol}{(stop.estimated_cost || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                            {stop.start_time && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Clock className="w-4 h-4" />
                                {String(stop.start_time).slice(0, 5)}
                              </span>
                            )}
                            <span className="text-gray-600">{stop.duration_minutes} min</span>
                            {stop.opening_hours && (
                              <span className="text-gray-600">{stop.opening_hours}</span>
                            )}
                            <a
                              href={mapsUrlForStop(stop)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Maps
                            </a>
                          </div>

                          {stop.notes && (
                            <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-3">
                              💡 {stop.notes}
                            </p>
                          )}

                          {editMode && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              <Button
                                size="sm" variant="outline" className="gap-1"
                                disabled={busy}
                                onClick={() => { setEditingStop(stop); setStopDialogOpen(true) }}
                              >
                                <Pencil className="w-3 h-3" /> Edit
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                disabled={busy || index === 0}
                                onClick={() => moveStop(day, index, -1)}
                                aria-label="Move earlier"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                disabled={busy || index === day.stops.length - 1}
                                onClick={() => moveStop(day, index, 1)}
                                aria-label="Move later"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                className="gap-1 text-red-600 hover:text-red-700"
                                disabled={busy}
                                onClick={() => deleteStop(stop)}
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
          )}
        </div>

        {/* Map column — sticky on desktop so it stays in view while scrolling itinerary */}
        <div className="sticky top-6 h-[calc(100vh-8rem)]">
          {day ? (
            <TripMap
              stops={day.stops ?? []}
              onStopClick={undefined}
              dayIndex={selectedDay}
            />
          ) : (
            <TripMapPlaceholder totalStops={0} geocodedStops={0} />
          )}
        </div>
      </div>

    {/* Mobile: show itinerary OR map, not both */}
    <div className="lg:hidden">
      {mobileTab === 'itinerary' && day && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl">
                  {day.day_title || `Day ${day.day_number}`}
                </CardTitle>
                <CardDescription>{formatDate(day.date)}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!day.stops?.length ? (
                <p className="text-gray-500 text-center py-8">
                  {editMode ? 'No stops yet — add the first one.' : 'No stops planned for this day'}
                </p>
              ) : (
                day.stops.map((stop, index) => {
                  const config = CATEGORY_CONFIG[stop.category ?? ''] ?? CATEGORY_CONFIG.attraction
                  const CategoryIcon = config.icon

                  return (
                    <div key={stop.id} className="relative">
                      {index < day.stops.length - 1 && (
                        <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      <div className="flex gap-3">
                        <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                          <CategoryIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-gray-900">{stop.place_name}</p>
                            {editMode && (
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingStop(stop); setStopDialogOpen(true) }}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-red-600" disabled={busy} onClick={() => deleteStop(stop)}>
                                  <Trash2 className="w-3 h-3" /> Remove
                                </Button>
                              </div>
                            )}
                          </div>
                          {stop.address && <p className="text-sm text-gray-500">{stop.address}</p>}
                          {stop.notes && <p className="text-sm text-gray-600 mt-1">{stop.notes}</p>}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                            {stop.start_time && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Clock className="w-4 h-4" />
                                {String(stop.start_time).slice(0, 5)}
                              </span>
                            )}
                            <span className="text-gray-600">{stop.duration_minutes} min</span>
                            {stop.estimated_cost ? (
                              <span className="text-gray-600">{symbol}{stop.estimated_cost.toLocaleString()}</span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <a
                              href={mapsUrlForStop(stop)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Open in Maps
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {mobileTab === 'map' && (
        <div className="h-[60vh] rounded-lg overflow-hidden border">
          {day ? (
            <TripMap
              stops={day.stops ?? []}
              onStopClick={undefined}
              dayIndex={selectedDay}
            />
          ) : (
            <TripMapPlaceholder totalStops={0} geocodedStops={0} />
          )}
        </div>
      )}
    </div>

      {currentUserId && (
        <TripMembersList
          trip={trip as never}
          currentUserId={currentUserId}
          onMembersChange={loadTrip}
        />
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" className="gap-2" onClick={() => setSettingsOpen(true)}>
            <Edit className="w-4 h-4" />
            Trip details
          </Button>
        </div>
      )}

      {day && stopDialogOpen && (
        <StopFormDialog
          key={editingStop?.id ?? `new-${day.id}`}
          open
          onOpenChange={setStopDialogOpen}
          tripId={tripId}
          dayId={day.id}
          stop={editingStop}
          onSaved={loadTrip}
        />
      )}

      {settingsOpen && (
        <TripSettingsDialog
          key={trip.id}
          open
          onOpenChange={setSettingsOpen}
          trip={trip}
          onSaved={loadTrip}
        />
      )}
    </div>
  )
}
