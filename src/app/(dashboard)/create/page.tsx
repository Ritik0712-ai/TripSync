'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  MapPin, Calendar, Users, DollarSign, Wand2, Loader2, 
  ChevronRight, ChevronLeft, Check, Utensils, Camera, 
  ShoppingBag, Building, Car, Heart, Mountain, Sun, PartyPopper,
  Palmtree, CameraIcon, Coffee, Moon, Sparkles
} from 'lucide-react'

// Interest options with icons
const INTEREST_OPTIONS = [
  { id: 'beaches', label: 'Beaches', icon: Palmtree },
  { id: 'culture', label: 'Culture & History', icon: Building },
  { id: 'food', label: 'Food & Dining', icon: Utensils },
  { id: 'adventure', label: 'Adventure', icon: Mountain },
  { id: 'nature', label: 'Nature', icon: Camera },
  { id: 'nightlife', label: 'Nightlife', icon: Moon },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'photography', label: 'Photography', icon: CameraIcon },
  { id: 'relaxation', label: 'Relaxation', icon: Coffee },
  { id: 'festivals', label: 'Festivals & Events', icon: PartyPopper },
]

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
]

interface Stop {
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
}

interface Day {
  day_number: number
  date: string
  day_title: string
  stops: Stop[]
}

interface GeneratedItinerary {
  trip_title: string
  days: Day[]
  total_estimated_cost: number
  trip_summary: string
}

export default function CreateTripPage() {
  const router = useRouter()
  
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedItinerary, setGeneratedItinerary] = useState<GeneratedItinerary | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)
  
  // Form state
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [travelStyle, setTravelStyle] = useState('solo')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [groupSize, setGroupSize] = useState(1)
  const [budget, setBudget] = useState('')
  const [currency, setCurrency] = useState('INR')

  // Destination suggestions
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Calculate number of days
  const numDays = startDate && endDate 
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0

  // Fetch destination suggestions from Photon API
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }
    
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
      )
      const data = await response.json()
      setSuggestions(data.features || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    }
  }

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (destination) {
        fetchSuggestions(destination)
      }
    }, 300)
    
    return () => clearTimeout(debounce)
  }, [destination])

  const selectSuggestion = (place: any) => {
    setDestination(place.properties.name + (place.properties.state ? ', ' + place.properties.state : ''))
    setShowSuggestions(false)
  }

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const generateItinerary = async () => {
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          startDate,
          endDate,
          budgetTotal: parseFloat(budget) || 0,
          currency,
          travelStyle,
          interests: selectedInterests,
          groupSize
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setGeneratedItinerary(data.itinerary)
        setStep(4)
      } else {
        alert(data.error || 'Failed to generate itinerary. Please try again.')
      }
    } catch (error) {
      console.error('Error generating itinerary:', error)
      alert('Failed to generate itinerary. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const saveTrip = async () => {
    if (!generatedItinerary) return
    
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedItinerary.trip_title,
          destination,
          startDate,
          endDate,
          budgetTotal: parseFloat(budget) || 0,
          currency,
          travelStyle,
          interests: selectedInterests,
          groupSize,
          days: generatedItinerary.days
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        router.push(`/trip/${data.trip.id}`)
      } else {
        alert(data.error || 'Failed to save trip. Please try again.')
      }
    } catch (error) {
      console.error('Error saving trip:', error)
      alert('Failed to save trip. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const regenerateItinerary = () => {
    setGeneratedItinerary(null)
    setStep(3)
    generateItinerary()
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return <Utensils className="w-4 h-4" />
      case 'attraction': return <Camera className="w-4 h-4" />
      case 'shopping': return <ShoppingBag className="w-4 h-4" />
      case 'hotel': return <Building className="w-4 h-4" />
      case 'transport': return <Car className="w-4 h-4" />
      case 'activity': return <Mountain className="w-4 h-4" />
      default: return <MapPin className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'food': return 'bg-orange-100 text-orange-700'
      case 'attraction': return 'bg-blue-100 text-blue-700'
      case 'shopping': return 'bg-pink-100 text-pink-700'
      case 'hotel': return 'bg-purple-100 text-purple-700'
      case 'transport': return 'bg-gray-100 text-gray-700'
      case 'activity': return 'bg-green-100 text-green-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Your Trip</h1>
          <p className="text-gray-600 mt-2">Let AI plan the perfect itinerary for you</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}
                `}>
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-20 h-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between max-w-md mx-auto mt-2 text-sm text-gray-500">
            <span>Basics</span>
            <span>Style</span>
            <span>Budget</span>
          </div>
        </div>

        {/* Step 1: Where + When */}
        {step === 1 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Where & When
              </CardTitle>
              <CardDescription>Tell us about your trip destination and dates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Destination */}
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <div className="relative">
                  <Input
                    id="destination"
                    placeholder="Search for a city or place..."
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    onFocus={() => destination && setShowSuggestions(true)}
                    className="text-lg"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {suggestions.map((place, index) => (
                        <button
                          key={index}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                          onClick={() => selectSuggestion(place)}
                        >
                          <p className="font-medium">{place.properties.name}</p>
                          <p className="text-sm text-gray-500">
                            {place.properties.city || place.properties.state || place.properties.country}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {numDays > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-blue-800 font-medium">
                    {numDays} day{numDays > 1 ? 's' : ''} trip
                  </p>
                </div>
              )}

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setStep(2)}
                disabled={!destination || !startDate || !endDate}
              >
                Continue
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Who + Style */}
        {step === 2 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Who & Style
              </CardTitle>
              <CardDescription>Help us understand your travel preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Travel Style */}
              <div className="space-y-3">
                <Label>Travel Style</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'solo', label: 'Solo', icon: Users },
                    { id: 'couple', label: 'Couple', icon: Heart },
                    { id: 'friends', label: 'Friends', icon: Users },
                    { id: 'family', label: 'Family', icon: Users },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setTravelStyle(style.id)}
                      className={`
                        p-4 rounded-lg border-2 text-center transition-all
                        ${travelStyle === style.id 
                          ? 'border-blue-600 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      <style.icon className={`w-6 h-6 mx-auto mb-2 ${
                        travelStyle === style.id ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <span className="font-medium">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Size */}
              {(travelStyle === 'friends' || travelStyle === 'family') && (
                <div className="space-y-2">
                  <Label htmlFor="groupSize">Number of Travelers</Label>
                  <Input
                    id="groupSize"
                    type="number"
                    min={2}
                    max={20}
                    value={groupSize}
                    onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                  />
                </div>
              )}

              {/* Interests */}
              <div className="space-y-3">
                <Label>What interests you? (Select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => {
                    const Icon = interest.icon
                    const isSelected = selectedInterests.includes(interest.id)
                    return (
                      <button
                        key={interest.id}
                        onClick={() => toggleInterest(interest.id)}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all
                          ${isSelected 
                            ? 'border-blue-600 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'}
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{interest.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(1)}
                >
                  <ChevronLeft className="mr-2 w-4 h-4" />
                  Back
                </Button>
                <Button 
                  className="flex-1" 
                  size="lg"
                  onClick={() => setStep(3)}
                  disabled={selectedInterests.length === 0}
                >
                  Continue
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Budget + Generate */}
        {step === 3 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Budget
              </CardTitle>
              <CardDescription>Set your total trip budget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label htmlFor="budget">Total Budget</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    {CURRENCIES.find(c => c.code === currency)?.symbol || '₹'}
                  </span>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="15000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="pl-10 text-lg"
                    min={0}
                  />
                </div>
                {numDays > 0 && budget && (
                  <p className="text-sm text-gray-500">
                    Approximately {CURRENCIES.find(c => c.code === currency)?.symbol}{Math.round(parseFloat(budget) / numDays).toLocaleString()} per day
                  </p>
                )}
              </div>

              {/* Trip Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-gray-900">Trip Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-gray-600">Destination:</p>
                  <p className="font-medium">{destination}</p>
                  <p className="text-gray-600">Dates:</p>
                  <p className="font-medium">{startDate} to {endDate}</p>
                  <p className="text-gray-600">Duration:</p>
                  <p className="font-medium">{numDays} days</p>
                  <p className="text-gray-600">Style:</p>
                  <p className="font-medium capitalize">{travelStyle}</p>
                  <p className="text-gray-600">Interests:</p>
                  <p className="font-medium">{selectedInterests.length} selected</p>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={generateItinerary}
                disabled={isGenerating || !budget}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    Generating your perfect trip...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 w-5 h-5" />
                    Generate AI Itinerary
                  </>
                )}
              </Button>
              
              {isGenerating && (
                <div className="space-y-2">
                  <Progress value={66} className="h-2" />
                  <p className="text-sm text-gray-500 text-center">
                    Our AI is crafting the perfect itinerary for you...
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(2)}
                  disabled={isGenerating}
                >
                  <ChevronLeft className="mr-2 w-4 h-4" />
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Generated Itinerary */}
        {step === 4 && generatedItinerary && (
          <div className="space-y-6">
            {/* Trip Header */}
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <Badge className="w-fit bg-white/20 text-white mb-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
                <CardTitle className="text-2xl">{generatedItinerary.trip_title}</CardTitle>
                <CardDescription className="text-blue-100">
                  {generatedItinerary.trip_summary}
                </CardDescription>
                <div className="flex items-center gap-4 mt-4 text-sm text-blue-100">
                  <span>{destination}</span>
                  <span>•</span>
                  <span>{startDate} to {endDate}</span>
                  <span>•</span>
                  <span>{CURRENCIES.find(c => c.code === currency)?.symbol}{generatedItinerary.total_estimated_cost.toLocaleString()} estimated</span>
                </div>
              </CardHeader>
            </Card>

            {/* Day Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {generatedItinerary.days.map((day, index) => (
                <button
                  key={day.day_number}
                  onClick={() => setSelectedDay(index)}
                  className={`
                    px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all
                    ${selectedDay === index 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  Day {day.day_number}
                </button>
              ))}
            </div>

            {/* Selected Day Details */}
            {generatedItinerary.days[selectedDay] && (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {generatedItinerary.days[selectedDay].day_title}
                    </span>
                    <Badge variant="outline">
                      {new Date(generatedItinerary.days[selectedDay].date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {generatedItinerary.days[selectedDay].stops.map((stop, index) => (
                      <div key={index} className="relative">
                        {/* Timeline connector */}
                        {index < generatedItinerary.days[selectedDay].stops.length - 1 && (
                          <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gray-200" />
                        )}
                        
                        <div className="flex gap-4">
                          {/* Time */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getCategoryColor(stop.category)}`}>
                              {getCategoryIcon(stop.category)}
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 pb-6">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900">{stop.place_name}</h4>
                                <p className="text-sm text-gray-500">{stop.address}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900">
                                  {CURRENCIES.find(c => c.code === currency)?.symbol}{stop.estimated_cost.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-gray-600">
                                {stop.start_time}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600">
                                {stop.duration_minutes} min
                              </span>
                              {stop.travel_time_from_prev > 0 && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-600">
                                    {stop.travel_time_from_prev} min {stop.travel_mode}
                                  </span>
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
                    ))}
                  </div>

                  {/* Day Summary */}
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Day Total:</span>
                      <span className="font-semibold">
                        {CURRENCIES.find(c => c.code === currency)?.symbol}
                        {generatedItinerary.days[selectedDay].stops.reduce((sum, s) => sum + s.estimated_cost, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline"
                size="lg"
                onClick={regenerateItinerary}
                disabled={isSaving}
              >
                <Wand2 className="mr-2 w-4 h-4" />
                Regenerate
              </Button>
              <Button 
                className="flex-1" 
                size="lg"
                onClick={saveTrip}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 w-5 h-5" />
                    Save Trip
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
