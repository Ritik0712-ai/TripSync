# TripSync

An AI trip planner that respects real-world constraints.

Most AI itinerary generators hand you a plausible-looking list of places. TripSync
generates a plan that actually holds up: stops are placed at times the venue is
open, meals land at meal times, travel time between stops is accounted for so you
never teleport across a city, and the whole plan stays inside your budget.

Tell it where, when, who with, what you like and how much you want to spend, and
it returns a day-by-day schedule you can share with the people you're travelling
with.

## Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React 19)                   |
| Database   | Neon Postgres                                        |
| ORM        | Drizzle                                              |
| Auth       | Neon Managed Better Auth (email + Google)           |
| AI         | Groq (primary), Gemini (fallback) — both free tier   |
| Places     | Photon API for destination autocomplete             |
| UI         | Tailwind CSS 4 + shadcn/ui                          |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

### Environment

```bash
DATABASE_URL=            # Neon pooled connection string
DATABASE_URL_UNPOOLED=   # Neon direct connection, for migrations
NEON_AUTH_BASE_URL=      # Neon Console -> Branch -> Auth -> Configuration
NEON_AUTH_COOKIE_SECRET= # openssl rand -base64 32
GROQ_API_KEY=           # primary
GEMINI_API_KEY=         # fallback

# Optional. Anthropic is supported but billed per call, so it is off by
# default. To use it: fund the account, set ANTHROPIC_API_KEY, and set
# AI_PROVIDER_ORDER=anthropic,groq,gemini
```

### Database

The Drizzle schema in `src/lib/db/schema.ts` is the source of truth.

```bash
npm run db:push      # apply the schema to Neon
npm run db:studio    # browse the data
```

## How it's put together

```
src/
├── app/
│   ├── (auth)/            sign in / sign up
│   ├── (dashboard)/       trip list, creation wizard, trip detail
│   ├── api/
│   │   ├── auth/          Neon Auth proxy
│   │   ├── trips/         trip CRUD, sharing, members
│   │   └── generate-itinerary/
│   └── join/              accept a share link
├── components/            UI, share dialog, member list
├── lib/
│   ├── auth/              server + client auth
│   └── db/                schema, access control, serialization
└── proxy.ts               session refresh (Next 16's middleware)
```

### A note on permissions

There is no row-level security. Every query goes through this app's own API
routes, and who-can-see-what is decided in one place — `src/lib/db/access.ts`.
An earlier version enforced this with Postgres RLS policies that referenced each
other in a cycle, which made every read fail with `infinite recursion detected in
policy`. One function is easier to reason about and can't get into that state.

See [MIGRATION.md](./MIGRATION.md) for the full history of the move off Supabase.

## Status

Working: auth, the trip creation wizard, AI itinerary generation, saving and
viewing trips, share links, and collaborator management.

Not built yet: the map view, geocoding, drag-to-reorder editing, and the
offline PWA — see the PRD for the full roadmap.
