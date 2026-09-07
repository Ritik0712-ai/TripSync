'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Plus, MapPin, Calendar, DollarSign, Users, 
  Plane, Mountain, Palmtree, Utensils, Camera,
  Trash2, Clock
} from 'lucide-react'

interface Trip {
  id: string
  title: string
  destination: string
  start_date: string
  end_date: string
  budget_total: number
  currency: string
  travel_style: string
  interests: string[]
  status: string
  created_at: string
  trip_days: any[]
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
}

const TRAVEL_STYLE_ICONS: Record<string, any> = {
  solo: Users,
  couple: Users,
  friends: Users,
  family: Users,
};

const INTEREST_ICONS: Record<string, any> = {
  beaches: Palmtree,
  culture: Building,
  food: Utensils,
  adventure: Mountain,
  nature: Camera,
  nightlife: Moon,
  shopping: ShoppingBag,
};

export default function DashboardPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const { data: session } = await authClient.getSession()

        if (session?.user) {
          setUserName(
            session.user.name?.split(' ')[0] ||
              session.user.email?.split('@')[0] ||
              'Traveler'
          )

          const response = await fetch('/api/trips')
          const data = await response.json()

          if (data.trips) {
            setTrips(data.trips)
          }
        }
      } catch (error) {
        console.error('Error fetching trips:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrips()
  }, [])

  const deleteTrip = async (tripId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this trip?')) return

    try {
      const response = await fetch(`/api/trips?id=${tripId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setTrips(prev => prev.filter(t => t.id !== tripId))
      }
    } catch (error) {
      console.error('Error deleting trip:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
      AUD: 'A$',
      SGD: 'S$',
      THB: '฿',
      MYR: 'RM',
      IDR: 'Rp',
      JPY: '¥',
    }
    return symbols[currency] || currency
  }

  const getTotalStops = (trip: Trip) => {
    return trip.trip_days?.reduce((sum, day: any) => sum + (day.stops?.length || 0), 0) || 0
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            {trips.length === 0 
              ? "Ready to plan your next adventure?" 
              : `You have ${trips.length} trip${trips.length !== 1 ? 's' : ''} planned`}
          </p>
        </div>
        <Link href="/create">
          <Button size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Plan New Trip
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {trips.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{trips.length}</div>
              <p className="text-sm text-gray-600">Total Trips</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">
                {trips.filter(t => t.status === 'active').length}
              </div>
              <p className="text-sm text-gray-600">Active Trips</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600">
                {trips.reduce((sum, t) => sum + getTotalStops(t), 0)}
              </div>
              <p className="text-sm text-gray-600">Places to Visit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-600">
                {trips.filter(t => t.status === 'completed').length}
              </div>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trips Grid */}
      {trips.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No trips yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start planning your first adventure! Our AI will create a personalized 
              itinerary based on your preferences and budget.
            </p>
            <Link href="/create">
              <Button size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Create Your First Trip
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/trip/${trip.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                {/* Header Image Placeholder */}
                <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-t-xl relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-white/50" />
                  </div>
                  <Badge 
                    className={`absolute top-3 right-3 ${STATUS_COLORS[trip.status] || STATUS_COLORS.planning}`}
                  >
                    {trip.status}
                  </Badge>
                </div>
                
                <CardHeader>
                  <CardTitle className="line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {trip.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {trip.destination}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Dates */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                    </span>
                  </div>
                  
                  {/* Budget */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>
                      {getCurrencySymbol(trip.currency)}{trip.budget_total?.toLocaleString() || 0} budget
                    </span>
                  </div>
                  
                  {/* Stops count */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Plane className="w-4 h-4" />
                    <span>{getTotalStops(trip)} stops planned</span>
                  </div>
                  
                  {/* Interests */}
                  {trip.interests && trip.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {trip.interests.slice(0, 3).map((interest: string) => (
                        <Badge key={interest} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                      {trip.interests.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{trip.interests.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex justify-between border-t pt-4">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Created {new Date(trip.created_at).toLocaleDateString()}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={(e) => deleteTrip(trip.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* CTA Section */}
      {trips.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Ready for another adventure?</h3>
          <p className="text-blue-100 mb-6">
            Create a new trip and let our AI craft the perfect itinerary for you.
          </p>
          <Link href="/create">
            <Button size="lg" variant="secondary" className="gap-2">
              <Plus className="w-5 h-5" />
              Plan Another Trip
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

// Need to import Building, Moon, ShoppingBag for the INTEREST_ICONS
import { Building, Moon, ShoppingBag } from 'lucide-react'
