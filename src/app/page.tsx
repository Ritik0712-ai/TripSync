'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, Sparkles, Users, Globe, Clock, DollarSign, 
  Zap, ChevronRight, Star, CheckCircle, ArrowRight
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await authClient.getSession()

      if (data?.user) {
        router.push('/dashboard')
      } else {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-500">Loading TripSync...</p>
        </div>
      </div>
    )
  }

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Planning',
      description: 'Get constraint-aware itineraries that actually work — with realistic timing, routes, and budgets.'
    },
    {
      icon: Users,
      title: 'Real-Time Collaboration',
      description: 'Plan trips with friends in real-time. Vote on stops, comment, and reach consensus together.'
    },
    {
      icon: Globe,
      title: 'Works Offline',
      description: 'Full itinerary cached on your phone. Navigate mid-trip even without internet in remote areas.'
    },
    {
      icon: Clock,
      title: 'Mid-Trip Mode',
      description: 'Start your trip in the app and get turn-by-turn navigation to each stop with one tap.'
    },
    {
      icon: DollarSign,
      title: 'Budget Intelligence',
      description: 'Track spending in real-time. Split costs with friends. Never go over budget again.'
    },
    {
      icon: Zap,
      title: '5-Minute Setup',
      description: 'Enter your destination, dates, and budget. Our AI generates your complete trip in seconds.'
    }
  ]

  const testimonials = [
    {
      name: 'Priya Sharma',
      location: 'Mumbai, India',
      text: 'First time solo traveler to Goa. TripSync planned everything perfectly — I just followed the app!',
      avatar: 'PS'
    },
    {
      name: 'Rahul Verma',
      location: 'Delhi, India',
      text: 'Planned a Ladakh trip with 6 friends. The collaborative features saved us hours of WhatsApp chaos.',
      avatar: 'RV'
    },
    {
      name: 'Ananya Patel',
      location: 'Bangalore, India',
      text: 'The budget tracker is incredible. Stayed within ₹15,000 for my entire Rishikesh weekend trip.',
      avatar: 'AP'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TripSync</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button className="gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Sparkles className="w-3 h-3 mr-1" />
            World&apos;s Smartest Free Trip Planner
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Plan your perfect
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              trip in minutes
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            AI-powered travel planning that actually understands constraints — 
            realistic timing, working routes, and budgets that add up. 
            Built for the next 500 million travelers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8 h-14 gap-2">
                Start Planning Free <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                Sign In
              </Button>
            </Link>
          </div>
          
          <p className="mt-6 text-sm text-gray-500">
            No credit card required • Free forever for solo travelers
          </p>

          {/* Mock Interface Preview */}
          <div className="mt-16 relative">
            <div className="bg-white rounded-2xl shadow-2xl border overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-4 text-white/80 text-sm">TripSync AI Itinerary</span>
                </div>
              </div>
              <div className="p-6 bg-gray-50">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Goa Beach Adventure</h3>
                      <p className="text-sm text-gray-500">3 days • ₹15,000 budget</p>
                    </div>
                    <Badge className="ml-auto bg-green-100 text-green-700">Day 1</Badge>
                  </div>
                  <div className="space-y-3">
                    {[
                      { time: '10:00 AM', place: 'Calangute Beach', type: 'Beach', cost: '₹0' },
                      { time: '1:00 PM', place: "Britto's Restaurant", type: 'Food', cost: '₹400' },
                      { time: '3:00 PM', place: 'Fort Aguada', type: 'History', cost: '₹50' },
                      { time: '7:00 PM', place: "Tito's Nightclub", type: 'Nightlife', cost: '₹500' },
                    ].map((stop, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500 w-16">{stop.time}</span>
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="flex-1">{stop.place}</span>
                        <Badge variant="secondary" className="text-xs">{stop.type}</Badge>
                        <span className="text-gray-600 w-12 text-right">{stop.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need for your trip
            </h2>
            <p className="text-xl text-gray-600">
              From planning to navigating — TripSync is your trip&apos;s operating system
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Plan a trip in 3 steps
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Tell us your trip',
                description: 'Enter destination, dates, budget, and what you love to do.'
              },
              {
                step: '2',
                title: 'AI generates your plan',
                description: 'Get a constraint-aware itinerary with timing, routes, and costs.'
              },
              {
                step: '3',
                title: 'Save and share',
                description: 'Store your trip, share with friends, and navigate mid-trip.'
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by travelers across India
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-blue-600">{testimonial.avatar}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to plan your next adventure?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of travelers planning smarter trips with TripSync.
            <br />
            It&apos;s completely free for solo travelers.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8 h-14 gap-2">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">TripSync</span>
            </div>
            <p className="text-sm text-gray-500">
              Built with ❤️ for travelers worldwide
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900">Privacy</a>
              <a href="#" className="hover:text-gray-900">Terms</a>
              <a href="#" className="hover:text-gray-900">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
