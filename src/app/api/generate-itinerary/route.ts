import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/server'

// The model ID is pinned here and overridable via env because providers retire
// models without warning. This project has already been burned twice: Groq's
// llama-3.1-8b-instant and Google's gemini-2.0-flash were both decommissioned
// and returned 404 model_not_found, which silently broke every generation.
// Verify the current ID against `GET https://api.anthropic.com/v1/models`
// rather than trusting this default.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5'
const ANTHROPIC_VERSION = '2023-06-01'
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b'
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

interface TripParams {
  destination: string
  startDate: string
  endDate: string
  budgetTotal: number
  currency: string
  travelStyle: string
  interests: string[]
  groupSize: number
}

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

function buildPrompt(params: TripParams): string {
  const startDate = new Date(params.startDate)
  const endDate = new Date(params.endDate)
  const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const budgetPerDay = Math.round(params.budgetTotal / numDays)

  return `You are TripSync's constraint-aware travel planning engine.

Generate a detailed day-by-day itinerary for the following trip:
- Destination: ${params.destination}
- Duration: ${params.startDate} to ${params.endDate} (${numDays} days)
- Budget: ${params.currency} ${params.budgetTotal} total (approx ${params.currency} ${budgetPerDay}/day)
- Travel Style: ${params.travelStyle}
- Interests: ${params.interests.join(', ')}
- Group Size: ${params.groupSize}

HARD CONSTRAINTS you must follow:
1. Each stop must have a realistic time slot. No teleporting — account for travel time between stops.
2. Restaurants must appear at meal times (breakfast 7-9am, lunch 12-2pm, dinner 7-9pm).
3. Attractions must be open during assigned time (museums typically close by 6pm, nightlife starts 9pm+).
4. First and last day: account for check-in/check-out. First stop Day 1 should be no earlier than 2pm if arriving by flight.
5. Total estimated cost across all stops must stay within budget.
6. Maximum 5-6 stops per day (tourists get tired).
7. Group stops geographically — minimize backtracking within a day.

Respond ONLY with a valid JSON object. No markdown, no explanation. Format:
{
  "trip_title": "string",
  "days": [
    {
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "day_title": "string",
      "stops": [
        {
          "position": 1,
          "place_name": "string",
          "category": "attraction|food|hotel|activity|transport|shopping",
          "address": "string",
          "start_time": "HH:MM",
          "duration_minutes": 90,
          "estimated_cost": 500,
          "travel_time_from_prev": 20,
          "travel_mode": "walk|auto|transit|drive",
          "opening_hours": "9:00 AM - 6:00 PM",
          "notes": "string — useful tip for this place"
        }
      ]
    }
  ],
  "total_estimated_cost": 12000,
  "trip_summary": "2-3 sentence overview of this trip"
}`
}

/**
 * Generate an itinerary with Claude.
 *
 * Two details worth knowing:
 *
 * 1. The Messages API has no JSON mode. Instead the assistant turn is
 *    pre-filled with an opening brace, which forces the reply to continue a
 *    JSON object rather than opening with "Here is your itinerary:". The brace
 *    is added back before parsing, since the response omits it.
 *
 * 2. Constraints live in the system prompt rather than the user turn. The
 *    model weights system instructions more heavily, which matters here — the
 *    whole product claim is that stops respect opening hours, meal times and
 *    travel time instead of being a plausible-looking list.
 */
async function generateWithClaude(
  prompt: string
): Promise<GeneratedItinerary | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error(
      'ANTHROPIC_API_KEY is not set. Add it to .env.local (and to the Vercel ' +
        'project settings before deploying).'
    )
    return null
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 16000,
        temperature: 0.7,
        system:
          "You are TripSync's constraint-aware travel planning engine. You " +
          'reply with a single valid JSON object and nothing else — no prose, ' +
          'no markdown fences, no explanation before or after.',
        messages: [
          { role: 'user', content: prompt },
          // Pre-filling the assistant turn is what guarantees JSON: the model
          // can only continue the object it has already started.
          { role: 'assistant', content: '{' },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('Anthropic API error:', response.status, detail)

      if (response.status === 404) {
        console.error(
          `Model "${ANTHROPIC_MODEL}" was not found. List the models your key ` +
            'can reach with: curl https://api.anthropic.com/v1/models ' +
            '-H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: ' +
            `${ANTHROPIC_VERSION}" — then set ANTHROPIC_MODEL in .env.local.`
        )
      }
      if (response.status === 401) {
        console.error('ANTHROPIC_API_KEY was rejected. Check it has not been revoked.')
      }
      if (response.status === 429) {
        console.error('Rate limited by Anthropic, or the account is out of credit.')
      }
      return null
    }

    const data = await response.json()
    const text = data.content?.[0]?.text

    if (!text) {
      console.error('Anthropic returned no text content:', JSON.stringify(data))
      return null
    }

    // The pre-filled brace is not echoed back, so put it back before parsing.
    const json = `{${text}`.trim()

    try {
      return JSON.parse(json) as GeneratedItinerary
    } catch (parseError) {
      console.error('Could not parse the itinerary as JSON:', parseError)
      console.error('First 500 chars received:', json.slice(0, 500))
      return null
    }
  } catch (error) {
    console.error('Anthropic request failed:', error)
    return null
  }
}

/**
 * Both fallback providers can return JSON wrapped in a markdown fence despite
 * being asked not to. Claude does not need this because its reply is forced by
 * the pre-filled brace, but Groq and Gemini do.
 */
function parseItinerary(raw: string, provider: string): GeneratedItinerary | null {
  let json = raw.trim()

  if (json.startsWith('```json')) json = json.slice(7)
  else if (json.startsWith('```')) json = json.slice(3)
  if (json.endsWith('```')) json = json.slice(0, -3)

  try {
    return JSON.parse(json.trim()) as GeneratedItinerary
  } catch (error) {
    console.error(`[${provider}] could not parse the itinerary as JSON:`, error)
    console.error(`[${provider}] first 500 chars:`, json.slice(0, 500))
    return null
  }
}

/** Fallback 1: Groq. Free tier, fastest of the three. */
async function generateWithGroq(prompt: string): Promise<GeneratedItinerary | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('[groq] GROQ_API_KEY is not set')
    return null
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      console.error('[groq] API error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) {
      console.error('[groq] returned no content')
      return null
    }
    return parseItinerary(text, 'groq')
  } catch (error) {
    console.error('[groq] request failed:', error)
    return null
  }
}

/** Fallback 2: Google Gemini. Free tier, last resort. */
async function generateWithGemini(prompt: string): Promise<GeneratedItinerary | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY is not set')
    return null
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            // Gemini spends part of this budget on internal reasoning tokens,
            // so it needs more headroom than the raw itinerary requires.
            maxOutputTokens: 16384,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      console.error('[gemini] API error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.error('[gemini] returned no content')
      return null
    }
    return parseItinerary(text, 'gemini')
  } catch (error) {
    console.error('[gemini] request failed:', error)
    return null
  }
}

/**
 * Providers in preference order. Claude writes the best itineraries but is the
 * only paid one; Groq and Gemini are free and exist so a bad key, an outage or
 * an exhausted quota degrades quality instead of breaking the feature.
 *
 * All three are kept working on purpose. A fallback that is never exercised
 * rots — which is exactly how the previous two models ended up decommissioned
 * without anyone noticing.
 */
const PROVIDERS: { name: string; run: (p: string) => Promise<GeneratedItinerary | null> }[] = [
  { name: `anthropic (${ANTHROPIC_MODEL})`, run: generateWithClaude },
  { name: `groq (${GROQ_MODEL})`, run: generateWithGroq },
  { name: `gemini (${GEMINI_MODEL})`, run: generateWithGemini },
]

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const params: TripParams = {
      destination: body.destination,
      startDate: body.startDate,
      endDate: body.endDate,
      budgetTotal: parseFloat(body.budgetTotal) || 0,
      currency: body.currency || 'INR',
      travelStyle: body.travelStyle || 'solo',
      interests: body.interests || [],
      groupSize: parseInt(body.groupSize) || 1
    }

    // Validate required fields
    if (!params.destination || !params.startDate || !params.endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: destination, startDate, endDate' },
        { status: 400 }
      )
    }

    // Build the prompt
    const prompt = buildPrompt(params)

    let itinerary: GeneratedItinerary | null = null
    let usedProvider: string | null = null

    for (const provider of PROVIDERS) {
      console.log(`Generating itinerary with ${provider.name}...`)
      itinerary = await provider.run(prompt)

      if (itinerary) {
        usedProvider = provider.name
        break
      }
      console.warn(`${provider.name} failed, falling back to the next provider`)
    }

    if (!itinerary) {
      return NextResponse.json(
        { error: 'Every AI provider failed. Please try again shortly.' },
        { status: 500 }
      )
    }

    console.log(`Itinerary generated successfully by ${usedProvider}`)

    return NextResponse.json({
      success: true,
      itinerary,
      // Surfaced so a degraded generation is visible rather than silent.
      provider: usedProvider,
    })

  } catch (error) {
    console.error('Generate itinerary error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
