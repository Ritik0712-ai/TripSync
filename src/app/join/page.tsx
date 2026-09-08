'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Calendar, Users, ArrowRight, Check, Loader2, AlertCircle } from 'lucide-react'

interface TripPreview {
  id: string
  title: string
  destination: string
  startDate: string
  endDate: string
  owner: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
}

function JoinContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const token = searchParams.get('token')
  
  const [trip, setTrip] = useState<TripPreview | null>(null)
  // Seeded from the token so the "no token" case is a first-render fact rather
  // than something an effect corrects a render later.
  const [loading, setLoading] = useState(() => Boolean(token))
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(() =>
    token ? null : 'No share token provided'
  )
  const [alreadyMember, setAlreadyMember] = useState(false)
  const [user, setUser] = useState<{ id: string; name?: string | null; email?: string | null } | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await authClient.getSession()
      setUser(data?.user ?? null)
    }
    checkUser()
  }, [])

  useEffect(() => {
    if (!token) return

    const fetchTripPreview = async () => {
      try {
        const response = await fetch(`/api/trips/join?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load trip')
        }

        setTrip(data.trip)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid or expired share link')
      } finally {
        setLoading(false)
      }
    }

    fetchTripPreview()
  }, [token])

  const handleJoin = async () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirectTo=${encodeURIComponent(`/join?token=${token}`)}`)
      return
    }

    setJoining(true)
    setError(null)

    try {
      const response = await fetch('/api/trips/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join trip')
      }

      if (data.alreadyMember) {
        setAlreadyMember(true)
      } else {
        setJoined(true)
      }

      // Redirect to trip after a short delay
      setTimeout(() => {
        router.push(`/trip/${data.trip?.id || trip?.id}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join trip')
    } finally {
      setJoining(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Unable to Join</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              The share link may be invalid or expired. Contact the trip owner for a new link.
            </p>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (joined || alreadyMember) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>{alreadyMember ? 'Already a Member' : 'Successfully Joined!'}</CardTitle>
            <CardDescription>
              {alreadyMember 
                ? `You're already a member of "${trip?.title}"`
                : `You've joined "${trip?.title}"`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting you to the trip...
            </p>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join Trip</CardTitle>
          <CardDescription>
            You&apos;ve been invited to collaborate on this trip
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Trip Preview */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{trip?.title}</h3>
                <p className="text-sm text-muted-foreground">{trip?.destination}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(trip?.startDate || '')} - {formatDate(trip?.endDate || '')}
              </span>
            </div>

            {trip?.owner && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
                  {trip.owner.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="text-sm">
                  <p className="font-medium">{trip.owner.full_name || 'Unknown'}</p>
                  <p className="text-muted-foreground">Trip Organizer</p>
                </div>
              </div>
            )}
          </div>

          {/* Role Info */}
          <div className="p-3 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-900 mb-1">As an Editor, you can:</p>
            <ul className="text-blue-700 space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                View the complete itinerary
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Add and edit stops
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Vote on activities
              </li>
            </ul>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              className="w-full gap-2" 
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
              ) : user ? (
                <>
                  Join Trip
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Sign In to Join
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
            
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full">
                Maybe Later
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </CardHeader>
        </Card>
      </div>
    }>
      <JoinContent />
    </Suspense>
  )
}
