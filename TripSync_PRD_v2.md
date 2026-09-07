# TripSync
## Product Requirements Document — International Edition
### *The World's Smartest Free Trip Planner*

> Built by a student. Designed for the world.

---

# PART 0 — THE BIG PICTURE

## What Are We Really Building?

TripSync is not another travel app. It's the **operating system for a trip** — the single layer that replaces 10 fragmented tools with one intelligent workspace. Think Notion meets Google Maps meets an AI travel agent — but free, fast, and built for the 500 million first-time travelers entering the tourism economy from emerging markets over the next decade.

The closest international competitors are:
- **Wanderlog** (US, Series A funded) — good but no real AI constraint logic
- **TripIt** (acquired by SAP Concur) — email-based, enterprise-focused
- **Layla AI** (YC-backed) — chat-first but no real itinerary structure

**The gap**: None of them have truly constraint-aware AI + real-time collaboration + offline-first + a zero-cost model for budget travelers. That's TripSync.

---

## Mission Statement

> *"Make world-class travel planning accessible to every curious person on earth — regardless of budget, experience, or language."*

---

## Core Differentiators (Why We Win)

| Feature | TripSync | Wanderlog | Layla AI | TripIt |
|--------|----------|-----------|----------|--------|
| Constraint-aware AI (time + route + hours) | ✅ | ❌ | ❌ | ❌ |
| Real-time group collaboration | ✅ | ✅ | ❌ | ❌ |
| Offline-first PWA | ✅ | ❌ | ❌ | ❌ |
| Free forever for solo travelers | ✅ | Partial | Partial | ❌ |
| Built for emerging market travelers | ✅ | ❌ | ❌ | ❌ |
| AI trip re-routing mid-trip | ✅ | ❌ | ❌ | ❌ |

---

# PART 1 — PRODUCT DEFINITION

## 1.1 Target Users

### Primary: The New Explorer
- Age 18–28, tier-2/3 city India (or Southeast Asia, Latin America)
- First trip outside home state or country
- Zero travel-savvy network to guide them
- Relies entirely on YouTube + Reddit for planning → overwhelmed
- Budget conscious, mobile-first

### Secondary: The Group Coordinator
- Age 22–32, planning trips for 4–10 people
- Spending hours in WhatsApp coordinating preferences, splitting bills
- Needs a shared workspace badly

### Tertiary: The Weekend Warrior
- Age 25–38, urban professional
- 3–4 short trips a year
- Values speed over depth — wants a solid plan in under 5 minutes
- Will pay for Pro if the free tier impresses them

---

## 1.2 Core User Journeys

### Journey 1: Solo Planner
```
Land on TripSync → Sign up (30 seconds) → Enter: Goa, 4 days, ₹15,000, Solo, Beaches + Nightlife
→ AI generates day-by-day itinerary with time slots, routing, cost estimates
→ View on interactive map → Edit any stop → Save → Share link with friend
```

### Journey 2: Group Planner
```
Create trip → Invite 4 friends via link → Each votes on activities
→ AI re-optimizes based on majority votes → Budget split shown per person
→ One person exports final itinerary as PDF → Everyone saves offline for the trip
```

### Journey 3: Mid-Trip User
```
Open TripSync day of trip (offline, no internet in Spiti Valley)
→ See today's stops cached → Navigate to first stop → Mark as visited
→ App suggests nearby alternative because original stop is closed
→ Check-in with photo → Auto-added to trip journal
```

---

## 1.3 Full Feature Set (Complete Vision)

### Core Features

**1. AI Itinerary Engine**
- Input: destination, dates, travel style, interests, budget, group size, mobility constraints
- Output: Structured day-by-day plan with: place name, category, time slot, duration, estimated cost, travel time from previous stop, travel mode, notes
- Constraint engine validates: opening hours, realistic travel time, meal slots, crowd times
- Re-generation: "Make it more adventurous" / "Switch Day 2 to indoor activities" / "Reduce budget by 20%"

**2. Interactive Map View**
- All stops pinned on map, connected by route lines
- Click any pin → see stop details sidebar
- Toggle: Day view / Full trip view
- Color coded by day

**3. Smart Itinerary Editor**
- Drag to reorder stops within a day
- Move stops between days
- Add place via search (Google Places / OpenStreetMap)
- Remove / replace with AI suggestion
- Inline editing of time, duration, notes

**4. Real-Time Group Workspace**
- Invite via link (no account needed to view, account needed to edit/vote)
- Live cursors on itinerary (like Notion/Figma)
- Vote on stops (up/down) → AI re-orders by popularity
- Comment threads on stops
- Change history (who moved what, when)

**5. Budget Intelligence**
- Set total budget at trip level
- Each stop has estimated cost (auto-filled by AI, editable)
- Running total: spent vs remaining
- Per-person split calculator
- Currency conversion (offline-cached rates)
- Budget warning alerts

**6. Offline-First PWA**
- Full itinerary available offline
- Cached maps (raster tiles for booked area)
- Works after initial sync with zero internet
- Background sync when connectivity restored

**7. Mid-Trip Mode**
- "Start Trip" button → activates trip mode
- Shows: current day, next stop, time remaining
- One-tap navigate to next stop (opens Maps)
- Mark visited / skipped / loved
- AI suggests replacement if stop skipped

**8. Trip Journal**
- Auto-generates draft journal entry from visited stops
- Add photos, notes, ratings per stop
- End of trip: auto-compiled journal / summary
- Export as PDF or share as public link

**9. AI Assistant (Chat)**
- In-context chat: "What's the best time to visit Dudhsagar Falls?"
- "Add a sunrise spot to Day 3"
- "We're vegetarian — flag all non-veg spots"
- Context-aware: knows your current itinerary

**10. Booking Deep Links**
- For each hotel/activity stop: show "Book on MakeMyTrip / Hostelworld / Booking.com" deep link
- Affiliate revenue without building a booking engine
- Price shown via free API or scraped estimate

**11. Discovery Feed (Phase 4+)**
- Public itineraries from community
- Filter: destination, duration, budget, style
- One-click clone any itinerary → edit and make it yours
- Trending destinations, hidden gems

**12. Multi-Language Support (Phase 4+)**
- Hindi, Tamil, Telugu, Bahasa, Spanish — AI generates itinerary in user's language
- UI localized

---

# PART 2 — FREE TECH STACK (₹0 to Run)

> Every tool listed here has a free tier sufficient to get you to 5,000+ users. Paid upgrades only needed post-monetization.

## 2.1 Frontend
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **Next.js 14** (App Router) | Framework — SSR, routing, API routes | Free forever (open source) |
| **Tailwind CSS** | Styling | Free forever |
| **Framer Motion** | Animations | Free for open source |
| **shadcn/ui** | Component library | Free forever |
| **Lucide Icons** | Icon system | Free forever |

## 2.2 Backend & Database
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **Supabase** | PostgreSQL DB + Auth + Realtime + Storage | 500MB DB, 2GB storage, 50k MAU auth — free |
| **Next.js API Routes** | Backend logic (no separate server needed) | Free on Vercel |
| **Upstash Redis** | Rate limiting, caching | 10k requests/day free |

## 2.3 AI
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **Google Gemini API** | Primary AI (itinerary generation) | **1,500 requests/day FREE** (Gemini 1.5 Flash) |
| **Groq API** | Backup AI / fast inference | **Free tier, extremely fast** (LLaMA 3.1) |
| **OpenRouter** | AI fallback router | Free credits on signup |

> **Strategy**: Use Gemini Flash as primary (free, capable). Groq as fallback if rate limited. Prompt-engineer hard so one API call = full itinerary. This keeps you well within free limits until you have thousands of DAUs.

## 2.4 Maps
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **Leaflet.js** | Interactive maps | Free forever (open source) |
| **OpenStreetMap tiles** | Map tiles | Free forever |
| **Nominatim API** | Geocoding (place → coordinates) | Free, no key needed |
| **OpenRouteService API** | Routing / directions | **2,000 requests/day free** |
| **Overpass API** | POI data (places, hours, categories) | Free forever |

> This entire maps stack costs ₹0. It's what OpenStreetMap contributors worldwide built. Leaflet + OSM is used by Wikipedia, Uber (early days), and many YC startups.

## 2.5 Place Search & Data
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **Photon API** (by Komoot) | Place autocomplete | Free, no key |
| **OpenTripMap API** | Tourist attractions, POI data | 1000 requests/day free |
| **RestCountries API** | Country info, currencies | Free forever |
| **Open-Meteo API** | Weather data | Free forever, no key |
| **ExchangeRate API** | Currency conversion | 1500 requests/month free |

## 2.6 Auth
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **Supabase Auth** | Email + Google + GitHub OAuth | 50,000 MAU free |

## 2.7 Deployment & DevOps
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **Vercel** | Frontend + API deployment | Hobby tier free (perfect for student projects) |
| **GitHub** | Version control + CI/CD | Free |
| **Vercel Analytics** | User analytics | Free on hobby tier |

## 2.8 Email
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **Resend** | Transactional email | 3,000 emails/month free |

## 2.9 PDF Export
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **react-pdf** | Generate trip PDFs client-side | Free forever |

## 2.10 PWA / Offline
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **next-pwa** | Service worker, offline caching | Free forever |
| **Workbox** | Cache strategies | Free forever |

---

## 2.11 Full Architecture Diagram

```
User Browser
     │
     ▼
┌─────────────────────────────────────────────┐
│              Next.js on Vercel              │
│  ┌──────────────┐    ┌────────────────────┐ │
│  │  React UI    │    │   API Routes       │ │
│  │  Tailwind    │    │  (serverless fns)  │ │
│  │  Framer      │    └────────┬───────────┘ │
│  │  Leaflet     │             │             │
│  └──────────────┘             │             │
└──────────────────────────────┼─────────────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
          ▼                     ▼                      ▼
   ┌─────────────┐    ┌──────────────────┐    ┌──────────────┐
   │  Supabase   │    │   Gemini API     │    │  OSM / ORS   │
   │  PostgreSQL │    │   (AI Engine)    │    │  Maps Stack  │
   │  Auth       │    │   Groq Fallback  │    │  Nominatim   │
   │  Realtime   │    └──────────────────┘    └──────────────┘
   │  Storage    │
   └─────────────┘
          │
    ┌─────▼──────┐
    │   Upstash  │
    │   Redis    │
    │  (caching) │
    └────────────┘
```

---

# PART 3 — DATABASE SCHEMA

```sql
-- Users (handled by Supabase Auth, extended here)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  preferred_currency TEXT DEFAULT 'INR',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  destination_lat FLOAT,
  destination_lng FLOAT,
  start_date DATE,
  end_date DATE,
  budget_total NUMERIC,
  currency TEXT DEFAULT 'INR',
  travel_style TEXT, -- solo/couple/group/family
  interests TEXT[], -- ['beaches','food','culture']
  group_size INT DEFAULT 1,
  is_public BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  status TEXT DEFAULT 'planning', -- planning/active/completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itinerary Days
CREATE TABLE trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  date DATE,
  day_title TEXT,
  notes TEXT
);

-- Itinerary Stops
CREATE TABLE stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID REFERENCES trip_days(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  position INT NOT NULL, -- order within day
  place_name TEXT NOT NULL,
  place_id TEXT, -- OSM or Photon ID
  category TEXT, -- food/attraction/transport/hotel/activity
  lat FLOAT,
  lng FLOAT,
  address TEXT,
  start_time TIME,
  duration_minutes INT,
  estimated_cost NUMERIC DEFAULT 0,
  travel_time_from_prev INT, -- minutes
  travel_mode TEXT, -- walk/auto/transit/drive
  opening_hours TEXT,
  notes TEXT,
  is_visited BOOLEAN DEFAULT FALSE,
  is_skipped BOOLEAN DEFAULT FALSE
);

-- Collaborators
CREATE TABLE trip_members (
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer', -- owner/editor/viewer
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (trip_id, user_id)
);

-- Stop Votes (for group planning)
CREATE TABLE stop_votes (
  stop_id UUID REFERENCES stops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vote INT CHECK (vote IN (1, -1)),
  PRIMARY KEY (stop_id, user_id)
);

-- Comments
CREATE TABLE stop_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id UUID REFERENCES stops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Entries
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES stops(id),
  user_id UUID REFERENCES profiles(id),
  content TEXT,
  photos TEXT[], -- Supabase storage URLs
  rating INT CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# PART 4 — AI PROMPTING STRATEGY

## Master Itinerary Generation Prompt

```
You are TripSync's constraint-aware travel planning engine.

Generate a detailed day-by-day itinerary for the following trip:
- Destination: {destination}
- Duration: {start_date} to {end_date} ({num_days} days)
- Budget: {currency} {budget_total} total (approx {budget_per_day}/day)
- Travel Style: {travel_style}
- Interests: {interests}
- Group Size: {group_size}

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
}
```

---

# PART 5 — PHASED DEVELOPMENT ROADMAP

> Rule: Every phase ends with something you can actually demo and get user feedback on. No black holes.

---

## 🟢 PHASE 1 — The Core Loop
**Timeline**: 3–4 weeks
**Goal**: Trip in, AI itinerary out. Clean, fast, impressive.
**Demo-able as**: "I built an AI travel planner" — actually works

### User Story
> As a user, I can sign up, enter my trip details, get a full AI-generated itinerary, and save it to my account.

### Build Checklist
- [ ] **Project setup**: Next.js 14 + Tailwind + shadcn/ui + Supabase
- [ ] **Auth**: Sign up / Login / Google OAuth via Supabase Auth
- [ ] **Trip creation form**: Multi-step wizard
  - Step 1: Where + When (destination autocomplete via Photon API, date picker)
  - Step 2: Who + Style (solo/couple/group, interests multi-select)
  - Step 3: Budget + Currency
- [ ] **AI integration**: Gemini Flash API call with master prompt
- [ ] **Itinerary display**: Beautiful card-based day view
  - Day tabs at top
  - Each stop: icon by category, name, time, duration, cost, notes
  - Total day cost footer
- [ ] **Save to DB**: Full schema as defined above
- [ ] **My Trips dashboard**: Grid of saved trips with thumbnail, destination, dates
- [ ] **Regenerate**: "Not happy? Regenerate" button
- [ ] **Loading state**: Animated skeleton while AI generates (takes 3–5 seconds)
- [ ] **Error handling**: Graceful fallback if AI fails or rate limited
- [ ] **Basic responsive design**: Works on mobile

### Free APIs Used in Phase 1
- Gemini Flash (itinerary generation)
- Photon API (place autocomplete)
- Supabase (DB + Auth)
- Vercel (deployment)

### Phase 1 Done When
A stranger can sign up, plan a trip to any city in the world, get a real AI itinerary, and save it. No bugs, no broken states.

---

## 🔵 PHASE 2 — Make It Visual + Editable
**Timeline**: 3–4 weeks
**Goal**: The itinerary lives on a map. You can edit it. You can share it.
**Demo-able as**: A genuinely useful travel planning tool

### User Story
> As a user, I can see my entire trip on an interactive map, edit any stop, add new places, and share my itinerary with a public link.

### Build Checklist
- [ ] **Map integration**: Leaflet.js + OpenStreetMap tiles
  - All stops pinned on map with numbered markers
  - Route lines connecting stops in order (per day)
  - Color-coded by day
  - Click pin → stop detail popup
- [ ] **Geocoding**: Nominatim API to get lat/lng for each stop name
  - Run geocoding after AI generation, store in DB
- [ ] **Split view**: Left panel = day cards, Right panel = map (desktop)
  - Mobile: toggle tabs between list and map
- [ ] **Itinerary editor**:
  - Drag-to-reorder stops within a day (dnd-kit library)
  - Move stop to different day (drag or dropdown)
  - Edit: time, duration, cost, notes (inline edit)
  - Delete stop
  - Add stop: search via Photon API → picks from results → AI auto-fills details
- [ ] **AI replace**: Right-click stop → "Replace with AI suggestion" → Gemini suggests alternative in same area + category
- [ ] **Day summary bar**: Total distance, total time, total estimated cost per day
- [ ] **Public share link**: `/trip/[share_token]` — read-only beautiful view
  - No login required to view
  - "Clone this trip" CTA for logged-in users
- [ ] **Routing**: OpenRouteService API for actual route between stops
  - Show ETA between stops on map

### Free APIs Added in Phase 2
- Leaflet.js + OpenStreetMap (maps)
- Nominatim (geocoding)
- OpenRouteService (routing)
- Photon (place search)

### Phase 2 Done When
A user can plan, visualize on map, edit freely, and share their trip. Another user can clone it.

---

## 🟣 PHASE 3 — Group Planning + Budget Intelligence
**Timeline**: 3–4 weeks
**Goal**: Make it work for the most common real-world use case — planning with friends
**Demo-able as**: "Notion for trips" — a collaborative workspace

### User Story
> As a group of friends, we can all join the same trip, vote on activities, track our shared budget, and see each other's changes live.

### Build Checklist
- [ ] **Invite system**:
  - "Invite collaborators" → generates invite link
  - Roles: Owner, Editor, Viewer
  - Accept invite → added to trip_members
- [ ] **Real-time sync**: Supabase Realtime subscriptions
  - Any change (add/delete/reorder stop) → syncs to all open sessions instantly
  - Live presence: show avatars of who's currently viewing
- [ ] **Voting system**:
  - Each stop has 👍 / 👎 buttons
  - Vote count shown
  - "Sort by votes" option → reorders stops by popularity
  - AI re-optimization: "Rebuild itinerary based on votes" button
- [ ] **Comment threads**:
  - Comment on any stop → threaded replies
  - @mention collaborators
  - Unread indicator
- [ ] **Budget tracker**:
  - Trip-level budget set at creation
  - Each stop: editable cost field
  - Running total: spent vs remaining (progress bar)
  - Per-person split: total cost / group size
  - Budget warning: yellow at 80%, red at 100%
- [ ] **Multi-currency**:
  - ExchangeRate API for conversion
  - Each person can view costs in their local currency
- [ ] **Activity log**: Right sidebar showing "Ritik added Dudhsagar Falls to Day 3" (like Notion history)
- [ ] **Conflict resolution**: If two people edit same stop simultaneously → last-write-wins with toast notification

### Free APIs Added in Phase 3
- Supabase Realtime (live sync)
- ExchangeRate API (currency)

### Phase 3 Done When
5 friends can be in the same trip simultaneously, vote on stops, see the budget split, and reach consensus on a plan. All in real-time.

---

## ⚫ PHASE 4 — The Travel Companion (PWA + Mid-Trip)
**Timeline**: 3–4 weeks
**Goal**: TripSync goes from planner to companion — works mid-trip, even offline
**Demo-able as**: An app people install on their phone and use while actually traveling

### User Story
> As a traveler currently in Spiti Valley with no internet, I can open TripSync, see today's stops, navigate to the next one, and mark places as visited.

### Build Checklist
- [ ] **PWA setup**: next-pwa + manifest.json
  - Installable on Android and iOS (Add to Home Screen)
  - App icon, splash screen
- [ ] **Service Worker caching**:
  - Cache: full itinerary data, map tiles for trip area, stop details
  - Workbox strategies: CacheFirst for tiles, NetworkFirst for live data
- [ ] **Trip Mode UI**: Activate when trip start date arrives
  - Bottom nav: Today / Map / Journal
  - "Today" view: current day's stops in order, countdown to next stop
  - One-tap "Navigate" button → opens Google Maps / Apple Maps with coordinates
- [ ] **Visit tracking**:
  - Mark stop as: Visited ✅ / Skipped ⏭️ / Loved ❤️
  - Visited stops greyed out on map
- [ ] **AI mid-trip re-routing**:
  - User skips a stop → AI suggests replacement from area (cached suggestions)
  - User asks chat: "I have 2 extra hours, what's nearby?" → AI uses current location + remaining itinerary
- [ ] **Weather integration**: Open-Meteo API
  - Day-of weather shown at top of Today view
  - Weather alert: "Rain expected at 3pm — Dudhsagar might be wet"
  - Auto-suggest indoor alternatives on bad weather days
- [ ] **Trip Journal**:
  - After marking visited → prompt: "Add a note or photo?"
  - Photos upload to Supabase Storage
  - Auto-draft: AI writes journal paragraph from visited stops + timestamps
- [ ] **End of trip**:
  - Trip summary: stats (places visited, km traveled, total spent vs budget)
  - Auto-generated journal PDF (react-pdf)
  - "Share your trip" → creates public story page

### Free APIs Added in Phase 4
- Open-Meteo (weather)
- Supabase Storage (photos)
- next-pwa + Workbox (offline)

### Phase 4 Done When
A user installs TripSync on their phone before a trip, uses it fully offline mid-trip, and exports a journal at the end.

---

## 💰 PHASE 5 — Monetization + Growth Engine
**Timeline**: 4–5 weeks
**Goal**: Turn users into revenue. Build the viral loop.
**Demo-able as**: A real startup with MRR

### User Story
> As a power user, I upgrade to Pro for unlimited trips and advanced features. As a new user, I discover TripSync through a friend's shared itinerary.

### Build Checklist

**Monetization**
- [ ] **Razorpay integration** (free to integrate, 2% per transaction)
  - Pro plan: ₹149/month or ₹999/year
  - Pro features: unlimited trips, unlimited collaborators, offline mode, journal export, priority AI
  - Free tier: 3 trips/month, 2 collaborators, no offline
- [ ] **Paywalls**: graceful upgrade prompts at feature limits
- [ ] **Affiliate deep links**:
  - Hotel stop → "Book on Booking.com" / "Book on Hostelworld" affiliate link
  - Flight stop → "Search flights on Skyscanner" affiliate link
  - Activity stop → "Book on GetYourGuide" affiliate link
  - Commission: 3–8% per booking (passive revenue)

**Growth Engine**
- [ ] **Community itinerary feed**:
  - Public itineraries (opt-in) browsable by destination, duration, budget, style
  - Search + filter
  - One-click clone → "Edit and make it yours"
  - SEO: each public itinerary = a static page indexed by Google
    - "/itinerary/3-days-in-goa-beaches-₹8000" → massive organic traffic
- [ ] **SEO strategy**:
  - 1000+ auto-generated city guides: "Best 3-day itinerary for [city]"
  - Static generation (Next.js SSG) → ultra-fast, indexed by Google
  - Target: "goa itinerary 3 days", "rajasthan trip plan", "manali itinerary" etc.
- [ ] **Referral system**:
  - Share your trip → friend signs up → both get 1 month Pro free
- [ ] **Email onboarding**: Resend
  - Day 0: Welcome + how to plan first trip
  - Day 3: Tips to share with friends
  - Day 7: Upgrade to Pro prompt
- [ ] **Analytics**: Vercel Analytics + custom event tracking
  - Track: itinerary generated, stops edited, invites sent, upgrades

### Phase 5 Done When
The app has a working payment system, affiliate links on every booking stop, a public feed that drives SEO traffic, and a referral loop that grows the user base organically.

---

# PART 6 — FULL FREE STACK SUMMARY

```
FRONTEND          Next.js 14 + Tailwind + shadcn/ui + Framer Motion
BACKEND           Next.js API Routes (serverless, on Vercel)
DATABASE          Supabase PostgreSQL (500MB free)
AUTH              Supabase Auth (50k MAU free)
REALTIME          Supabase Realtime (free tier)
STORAGE           Supabase Storage (1GB free)
CACHE             Upstash Redis (10k req/day free)
AI (PRIMARY)      Google Gemini Flash (1500 req/day FREE)
AI (BACKUP)       Groq (free tier, LLaMA 3.1, ultra fast)
MAPS              Leaflet.js + OpenStreetMap (free forever)
GEOCODING         Nominatim (free, no key)
PLACE SEARCH      Photon by Komoot (free, no key)
ROUTING           OpenRouteService (2000 req/day free)
POI DATA          OpenTripMap (1000 req/day free)
WEATHER           Open-Meteo (free forever, no key)
CURRENCY          ExchangeRate API (1500 req/month free)
EMAIL             Resend (3000 emails/month free)
PDF               react-pdf (free, client-side)
PWA               next-pwa + Workbox (free forever)
DEPLOYMENT        Vercel Hobby (free)
VERSION CONTROL   GitHub (free)
ANALYTICS         Vercel Analytics (free on hobby)
PAYMENTS          Razorpay (free to integrate, 2% per txn)
─────────────────────────────────────────
TOTAL COST        ₹0/month until significant scale
```

---

# PART 7 — METRICS & SUCCESS

| Phase | Key Metric | Target |
|-------|-----------|--------|
| Phase 1 | Itineraries generated | 100 in first month |
| Phase 2 | Shared trip links clicked | 500 in second month |
| Phase 3 | Group trips created | 200 in third month |
| Phase 4 | PWA installs | 1000 by end of Phase 4 |
| Phase 5 | MRR | ₹10,000/month (67 Pro users) |
| 12 months | MAU | 10,000+ |
| 12 months | Organic SEO traffic | 50,000 visits/month |

---

# PART 8 — WHAT MAKES THIS INTERNATIONAL-LEVEL

1. **Constraint-aware AI** — Not just suggestions. A plan that actually works in the real world.
2. **Offline-first** — Serves 4 billion people with unreliable internet.
3. **Real-time collaboration** — Figma-level presence for trip planning.
4. **SEO moat** — 1000+ auto-generated itinerary pages = compounding free traffic.
5. **Zero lock-in to paid APIs** — Runs free until thousands of DAUs. No VC needed to start.
6. **Emerging market-first** — Designed for the next 500M travelers, not Silicon Valley users.

---

*Document Version: 2.0 — International Edition*
*Product: TripSync | Author: Ritik | Stack: ₹0*
