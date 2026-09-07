# TripSync — Product Requirements Document
### *The AI-Powered Trip Planner for the Modern Explorer*

---

## 1. Problem Statement

Trip planning today is **fragmented**. A traveler bounces between 6–10 different apps to plan a single trip — flights on one platform, hotels on another, activities from YouTube and Reddit, itineraries built manually in WhatsApp chats and Notes apps. There is no single layer that connects location, time, budget, routing, and booking intelligence.

This problem is especially acute for **first-time travelers from tier-2/3 cities in India** — a demographic that's growing rapidly but is massively underserved by existing tools.

---

## 2. Vision

> **TripSync** is an AI-powered, constraint-aware travel planning platform that takes a destination and your preferences — and builds you a complete, time-logical, budget-aware, bookable itinerary in minutes. Not just ideas. A real plan.

---

## 3. Target Users (Personas)

| Persona | Description |
|--------|-------------|
| **The First-Timer** | 19–26, from a tier-2 city, first solo/group trip, overwhelmed by options, no travel-savvy friends to guide them |
| **The Group Planner** | Organizing a trip for 4–8 friends, managing conflicting preferences, budgets, and availability |
| **The Weekend Explorer** | Urban professional, 25–35, short trips 2–3 times a year, wants fast planning with zero friction |
| **The Backpacker** | Budget-conscious, flexible schedule, needs offline-first and low-cost routing options |

---

## 4. Core Problem Areas (What We're Solving)

1. **Fragmentation** — Everything lives in different apps with no shared state
2. **No real-world constraints** — AI tools suggest places but ignore travel time, business hours, distance logic
3. **No collaborative planning** — Group trips have no shared workspace
4. **Offline gap** — Rural/remote travelers lose access mid-trip
5. **Inspiration-to-execution gap** — "I want to visit Rajasthan" → no structured path to an actual plan

---

## 5. Core Features (Full Product Vision)

### 5.1 AI Itinerary Engine
- Input: destination, dates, budget, travel style, group size
- Output: day-by-day, hour-by-hour itinerary with real routing logic
- Respects opening hours, travel time between stops, meal breaks
- Reorders stops to minimize travel time (TSP-style optimization)

### 5.2 Unified Dashboard
- All trip info in one place: flights, hotels, activities, budget tracker
- Timeline view + map view (toggle between both)
- Import from email (like TripIt) for auto-populating bookings

### 5.3 Real-Time Adaptation
- If a flight is delayed → itinerary restructures automatically
- If a spot is closed on arrival day → replaces with alternative
- Weather-aware suggestions

### 5.4 Collaborative Planning
- Shared itinerary workspace for groups
- Vote on activities, split budget, comment on stops
- Real-time sync (like a Notion for trips)

### 5.5 Budget Intelligence
- Per-person and total budget tracking
- Cost estimates for each activity/transport leg
- Alerts when itinerary exceeds budget

### 5.6 Offline-First Mode
- Full itinerary cached locally
- Offline maps for booked locations
- Works with zero internet after initial sync

### 5.7 Booking Integration (Phase 3+)
- Deep links or direct booking for hotels, activities, transport
- Price comparison across platforms
- One-click booking via affiliate/API partnerships

---

## 6. Tech Stack (Recommended)

| Layer | Tech |
|-------|------|
| Frontend | React + Tailwind CSS |
| Backend | Node.js + Express (or Next.js API routes) |
| Database | PostgreSQL (trips, users) + Redis (sessions, cache) |
| AI | Anthropic Claude API / OpenAI for itinerary generation |
| Maps | Google Maps API / Mapbox |
| Auth | Clerk or NextAuth |
| Deployment | Vercel (frontend) + Railway/Render (backend) |
| Real-time (Phase 2+) | Socket.io or Supabase Realtime |

---

## 7. Success Metrics

| Metric | Target (6 months post-launch) |
|--------|-------------------------------|
| Active Users | 5,000 MAU |
| Itineraries Generated | 10,000+ |
| Avg. Session Time | >8 minutes |
| Retention (D7) | >30% |
| NPS Score | >40 |

---

## 8. Monetization Strategy

- **Free Tier**: 3 itineraries/month, basic AI, no collaboration
- **Pro (₹149/month)**: Unlimited itineraries, group planning, offline mode, budget tracker
- **Affiliate Revenue**: Commission on hotel/flight bookings via deep links (Phase 3)
- **B2B (Phase 4)**: White-label for travel agencies

---

---

# Phased Development Roadmap

> **Philosophy**: Each phase is a shippable, usable product. You're not building in the dark — at the end of every phase, you have something real you can show users and get feedback from.

---

## ✅ Phase 1 — The Core Loop (MVP)
**Goal**: User enters a destination + dates → gets a day-wise AI itinerary
**Shippable as**: A working web app you can demo

### What to Build
- [ ] Landing page with clear value prop
- [ ] User auth (sign up / login) — use Clerk for speed
- [ ] Trip creation form: destination, dates, budget range, travel style (solo/couple/group/family), interests (adventure/culture/food/etc.)
- [ ] Claude/OpenAI API integration → generates structured day-by-day itinerary
- [ ] Itinerary display UI: day-wise cards with place name, description, time slot, category
- [ ] Save itinerary to DB (PostgreSQL)
- [ ] View all saved trips (My Trips dashboard)
- [ ] Basic responsive design (mobile-first)

### What You're NOT Building Yet
- Maps, booking, collaboration, budget tracker, real-time anything

### Phase 1 Done When
- A user can sign up, fill in trip details, get a real AI-generated itinerary, and save it

---

## 🗺️ Phase 2 — Make It Real (Map + Time Logic)
**Goal**: The itinerary isn't just a list — it's time-aware and map-visualized
**Shippable as**: A genuinely useful planning tool

### What to Build
- [ ] Google Maps / Mapbox integration — show all stops on an interactive map
- [ ] Each itinerary stop has: estimated time, distance from previous stop, travel mode (walk/auto/transit)
- [ ] Time logic validation — AI prompt improved to respect opening hours, travel time between stops
- [ ] Edit itinerary — drag to reorder stops, change time slots, add/remove places
- [ ] Manual add place (search via Google Places API, add to any day)
- [ ] Day summary: total distance, estimated cost, number of stops
- [ ] Share itinerary via public link (read-only)

### Phase 2 Done When
- The itinerary shows on a map, times make logical sense, and a user can edit and share it

---

## 👥 Phase 3 — Group Planning + Budget Intelligence
**Goal**: Make it work for groups and money-conscious travelers
**Shippable as**: The go-to tool for group trip planning

### What to Build
- [ ] Invite collaborators to a trip (email invite or link)
- [ ] Real-time sync using Supabase Realtime or Socket.io
- [ ] Vote on activities (thumbs up/down per stop)
- [ ] Comments on individual stops
- [ ] Budget tracker: set total budget, assign estimated cost to each stop
- [ ] Per-person cost split calculator
- [ ] Budget vs. actual spend view
- [ ] Notification system: "Ritik added a new stop to Day 2"

### Phase 3 Done When
- A group of 4 friends can collaboratively plan and budget a trip together in real-time

---

## 📴 Phase 4 — Offline Mode + Real-Time Adaptation
**Goal**: The app works mid-trip, even without internet
**Shippable as**: A travel companion, not just a planner

### What to Build
- [ ] Progressive Web App (PWA) setup — installable on phone
- [ ] Offline caching of full itinerary + map tiles (via Service Workers)
- [ ] Trip status mode: "I'm on this trip now" — shows current day, next stop
- [ ] Real-time adaptation: if user marks a stop as "skipped" → AI suggests replacement
- [ ] Weather API integration → warns about rain, suggests indoor alternatives
- [ ] Check-in feature: mark stops as visited with timestamp
- [ ] Post-trip: auto-generate a travel summary / journal

### Phase 4 Done When
- A user can use TripSync mid-trip with zero internet and have a complete navigation + checklist experience

---

## 🔗 Phase 5 — Booking Integration + Monetization
**Goal**: Close the loop — plan AND book inside one product
**Shippable as**: A revenue-generating product

### What to Build
- [ ] Flight search integration (Skyscanner / Amadeus API) — show options inside app
- [ ] Hotel search (Booking.com or Agoda affiliate API)
- [ ] Activity booking deep links (GetYourGuide, Viator)
- [ ] Price comparison widget for each booking type
- [ ] Affiliate link tracking for revenue
- [ ] Pro plan paywall (Stripe / Razorpay integration)
- [ ] Email import: forward booking confirmations → auto-populate itinerary
- [ ] Analytics dashboard for admin: DAU, itineraries generated, revenue

### Phase 5 Done When
- The app generates real revenue via subscriptions + affiliate bookings

---

## Summary Table

| Phase | Core Value | Key Tech |
|-------|-----------|---------|
| Phase 1 | AI Itinerary Generation | Claude API, Auth, DB |
| Phase 2 | Map + Time Logic | Google Maps API, Drag-drop UI |
| Phase 3 | Group + Budget | Real-time sync, Supabase |
| Phase 4 | Offline + Mid-trip | PWA, Service Workers, Weather API |
| Phase 5 | Booking + Monetization | Affiliate APIs, Stripe/Razorpay |

---

*Document Version: 1.0 | Product: TripSync | Created for: Ritik*
