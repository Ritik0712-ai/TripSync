@AGENTS.md

# TripSync — Codebase invariants

Six rules, each earned from a real bug. Do not violate these.

---

## 1. No row-level security on any table

**Evidence**: `src/lib/db/schema.ts` comments explicitly state the intent, and
`drizzle.config.ts` has `schemaFilter: ['public']` which prevents accidental
inclusion. `src/lib/db/access.ts` is the single permission layer.

Permissions live in `src/lib/db/access.ts`. Every API route checks
`getTripAccess(tripId, userId)` before touching data. The old Supabase schema
enforced permissions with Postgres RLS policies that referenced each other in a
cycle (trips → trip_members → trips), which made every read fail with
`infinite recursion detected in policy`. A function in the application layer is
both simpler and impossible to get into that state.

**Never reintroduce RLS policies on `trips`, `trip_days`, `stops`, `trip_members`.**

---

## 2. Postgres `numeric` returns as a string; always coerce

**Evidence**: `src/lib/db/schema.ts:49` and `:113` define `budget_total` and
`estimated_cost` as `numeric(...)`. `src/lib/db/serialize.ts:34,72` uses
`num()` (a helper that calls `Number()`) to coerce every numeric before the
wire response.

The `@neondatabase/serverless` driver returns `numeric` columns as strings.
`05` + `00300` = `"0500300"` not `800`. Any arithmetic on a numeric field
without going through `serialize.ts` will concatenate.

**Every numeric column must pass through `num()` before reaching the client.**

---

## 3. The API wire format is snake_case; never mix conventions

**Evidence**: `src/lib/db/serialize.ts` is the boundary. It converts Drizzle's
camelCase (`startDate`, `estimatedCost`, `dayNumber`) to snake_case
(`start_date`, `estimated_cost`, `day_number`) for every response. The pages
expect snake_case (confirmed in `src/app/(dashboard)/dashboard/page.tsx` and
`src/app/(dashboard)/trip/[id]/page.tsx`).

**All API responses go through `serialize.ts`. Keep it stable or update every
consumer in the same change.**

---

## 4. `neon_auth` schema is read-only and excluded from migrations

**Evidence**: `src/lib/db/auth-schema.ts` has a comment explaining why it exists,
and `drizzle.config.ts` has `schemaFilter: ['public']`. The `neon_auth` schema
belongs to Neon's Managed Better Auth service. `authUsers` from `auth-schema.ts`
is used only in `.leftJoin()` for display names — it is never written to.

**Migrations must never touch `neon_auth`.** The `schemaFilter` guard in
`drizzle.config.ts` prevents `drizzle-kit push` from emitting anything for it,
but manual SQL must be reviewed carefully.

---

## 5. Route protection is in `src/proxy.ts`, not `middleware.ts`

**Evidence**: `src/proxy.ts` uses `processAuthMiddleware` from
`@neondatabase/auth/server` with a custom `skipRoutes` list that extends
`DEFAULT_AUTH_SKIP_ROUTES` with `/api/`. This ensures:

- `/api/*` routes return `401` (route handlers do their own auth check)
- Auth routes (`/api/auth/*`, `/auth/*`) are skipped (handled by
  `auth.handler()`)
- All other routes redirect to `/login` when unauthenticated

Next.js 16 renamed the middleware convention to `proxy.ts`. The convention is
enforced by the framework. **Do not recreate `middleware.ts`.**

---

## 6. Neon Auth endpoint names — how to check if auth is actually broken

`NEON_AUTH_BASE_URL` includes the `/neondb/auth` path segment. That is correct
and comes from Neon's provisioning API. Do not "fix" it to the bare host.

Managed Better Auth exposes these routes and no others:

```
GET  {BASE}/get-session
GET  {BASE}/.well-known/jwks.json
POST {BASE}/sign-in/email
POST {BASE}/sign-up/email
POST {BASE}/sign-in/social
POST {BASE}/sign-out
```

`/providers`, `/list`, `/session`, `/csrf`, `/health` and `/signin` do **not**
exist. Neon runs Fastify, whose 404 body names the method — `Route GET:/ not
found` — so a GET against a POST-only route also 404s. A session of guessing
URLs will therefore return 404 for everything and look exactly like a dead
service.

The one-line health check, which needs no auth and no cookies:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "$NEON_AUTH_BASE_URL/.well-known/jwks.json"   # 200 = auth is fine
```

Before concluding that managed infrastructure is down, find a call that is
*supposed* to succeed and prove that it doesn't.

---

# Verifying a change

```bash
npx tsc --noEmit     # must pass
npm run build        # must pass
```

`next build` regenerates the `.next/dev/types/**/*.ts` entry in `tsconfig.json`.
That is Next.js managing its own types — leave it alone rather than removing it
each time.

For anything touching permissions or the data layer, exercise it over real HTTP
against the live database rather than reasoning about it. The API surface was
last verified this way with 34 checks covering CRUD, cross-day reordering, day
renumbering, numeric coercion, cross-trip access attempts, and viewer-role
rejection.

---

# Not built yet

- **UI for editing.** The day/stop endpoints exist and are tested, but nothing
  in the interface calls them. "Edit Trip" and "Open in Maps" on the trip page
  still render without handlers.
- **Public share view.** Share links go to `/join`, which forces a sign-in.
  There is no read-only page for someone without an account.
- **Map, geocoding, drag-to-reorder.** PRD Phase 2. The `stops` table already
  has `lat`/`lng` columns waiting for it.
- **`stop_votes`, `stop_comments`, `journal_entries`.** Schema-only by choice,
  not oversight — group planning is PRD Phase 3 and the journal is Phase 4.
  Leave them empty until there are real users on a shared trip.
