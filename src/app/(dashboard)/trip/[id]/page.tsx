'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, MapPin, Calendar, DollarSign, Users, 
  Plane, Clock, Share2, Edit, Copy, Utensils, 
  Camera, ShoppingBag, Building, Car, Mountain,
  Share, ExternalLink, Check
} from 'lucide-react'
import { TripShareDialog } from '@/components/trip-share-dialog'
import { TripMembersList } from '@/components/trip-members-list'

interface Stop {
  id: string
  position: number
  place_name: string
  category: string
  address: string
  start_time: string
  duration_minutes: number
  estimated_cost: number
  travel_time_from_prev: number
  travel_mode: string
  opening_hours: string
  notes: string
  is_visited: boolean
  is_skipped: boolean
}

interface TripDay {
  id: string
  day_number: number
  date: string
  day_title: string
  notes: string
  stops: Stop[]
}

interface Trip {
  id: string
  owner_id: string
  title: string
  destination: string
  start_date: string
  end_date: string
  budget_total: number
  currency: string
  travel_style: string
  interests: string[]
  group_size: number
  status: string
  share_token: string
  is_public: boolean
  role?: 'owner' | 'editor' | 'viewer'
  is_owner?: boolean
  trip_days: TripDay[]
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AUD: 'A$',
  SGD: 'S$', THB: '฿', MYR: 'RM', IDR: 'Rp', JPY: '¥',
}

const CATEGORY_CONFIG: Record<string, { icon: any; color: string }> = {
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
  const [selectedTab, setSelectedTab] = useState('itinerary')
  const [selectedDay, setSelectedDay] = useState(0)
  const [copied, setCopied] = useState(false)

  const loadTrip = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}`)
      const data = await response.json()

      if (data.trip) {
        setTrip(data.trip)
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching trip:', error)
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [tripId, router])

  useEffect(() => {
    if (!tripId) return

    authClient.getSession().then(({ data }) => {
      setCurrentUserId(data?.user?.id ?? null)
    })

    loadTrip()
  }, [tripId, loadTrip])

  const isOwner = trip ? trip.is_owner ?? trip.owner_id === currentUserId : false

  const getCurrencySymbol = () => {
    return CURRENCY_SYMBOLS[trip?.currency || 'INR'] || '₹'
  }

  const getTotalCost = () => {
    if (!trip?.trip_days) return 0
    return trip.trip_days.reduce((sum, day) => 
      sum + (day.stops?.reduce((s, stop) => s + (stop.estimated_cost || 0), 0) || 0), 0
    )
  }

  const getDayCost = (day: TripDay) => {
    return day.stops?.reduce((sum, stop) => sum + (stop.estimated_cost || 0), 0) || 0
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })
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

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </Link>

      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <Badge className="bg-white/20 text-white mb-3">{trip.status}</Badge>
              <h1 className="text-3xl font-bold mb-2">{trip.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-blue-100">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {trip.destination}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {trip.group_size} {trip.group_size === 1 ? 'traveler' : 'travelers'}
                </span>
              </div>
            </div>
            <div className="shrink-0">
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
                {getCurrencySymbol()}{trip.budget_total?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Estimated Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                {getCurrencySymbol()}{getTotalCost().toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Budget Remaining</p>
              <p className="text-2xl font-bold text-green-600">
                {getCurrencySymbol()}{((trip.budget_total || 0) - getTotalCost()).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Stops</p>
              <p className="text-2xl font-bold text-gray-900">
                {trip.trip_days?.reduce((sum, d) => sum + (d.stops?.length || 0), 0) || 0}
              </p>
            </div>
          </div>

          {/* Budget Progress */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Budget Used</span>
              <span>{Math.round((getTotalCost() / (trip.budget_total || 1)) * 100)}%</span>
            </div>
            <Progress 
              value={(getTotalCost() / (trip.budget_total || 1)) * 100} 
              className="h-2"
            />
          </div>

          {/* Interests */}
          {trip.interests && trip.interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {trip.interests.map((interest: string) => (
                <Badge key={interest} variant="secondary">
                  {interest}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {trip.trip_days?.map((day, index) => (
          <button
            key={day.id}
            onClick={() => setSelectedDay(index)}
            className={`
              px-4 py-3 rounded-lg font-medium whitespace-nowrap transition-all flex flex-col items-center min-w-[100px]
              ${selectedDay === index 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border'}
            `}
          >
            <span>Day {day.day_number}</span>
            <span className={`text-xs ${selectedDay === index ? 'text-blue-100' : 'text-gray-500'}`}>
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </button>
        ))}
      </div>

      {/* Selected Day Itinerary */}
      {trip.trip_days && trip.trip_days[selectedDay] && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  {trip.trip_days[selectedDay].day_title}
                </CardTitle>
                <CardDescription>
                  {formatDate(trip.trip_days[selectedDay].date)}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Day Total</p>
                <p className="text-lg font-bold">
                  {getCurrencySymbol()}{getDayCost(trip.trip_days[selectedDay]).toLocaleString()}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trip.trip_days[selectedDay].stops?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No stops planned for this day</p>
              ) : (
                trip.trip_days[selectedDay].stops?.map((stop, index) => {
                  const categoryConfig = CATEGORY_CONFIG[stop.category] || CATEGORY_CONFIG.attraction
                  const CategoryIcon = categoryConfig.icon
                  
                  return (
                    <div key={stop.id} className="relative">
                      {/* Timeline connector */}
                      {index < trip.trip_days[selectedDay].stops!.length - 1 && (
                        <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      
                      <div className="flex gap-4">
                        {/* Icon */}
                        <div className={`flex flex-col items-center gap-2`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${categoryConfig.color}`}>
                            <CategoryIcon className="w-5 h-5" />
                          </div>
                          {stop.travel_time_from_prev && stop.travel_time_from_prev > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Car className="w-3 h-3" />
                              <span>{stop.travel_time_from_prev}m</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {stop.place_name}
                              </h4>
                              {stop.address && (
                                <p className="text-sm text-gray-500">{stop.address}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {getCurrencySymbol()}{stop.estimated_cost?.toLocaleString() || 0}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1 text-gray-600">
                              <Clock className="w-4 h-4" />
                              {stop.start_time}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">
                              {stop.duration_minutes} min
                            </span>
                            {stop.opening_hours && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-600">{stop.opening_hours}</span>
                              </>
                            )}
                          </div>
                          
                          {stop.notes && (
                            <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-3">
                              💡 {stop.notes}
                            </p>
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

      {/* Travellers on this trip */}
      {currentUserId && (
        <TripMembersList
          trip={trip as never}
          currentUserId={currentUserId}
          onMembersChange={loadTrip}
        />
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button variant="outline" className="gap-2">
          <Edit className="w-4 h-4" />
          Edit Trip
        </Button>
        <Button variant="outline" className="gap-2">
          <ExternalLink className="w-4 h-4" />
          Open in Maps
        </Button>
      </div>
    </div>
  )
}
