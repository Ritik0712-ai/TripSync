@AGENTS.md

# TripSync — Codebase invariants

Five rules, each grounded in a real bug. Do not violate these.

---

## 1. No row-level security on any table

**Evidence**: `drizzle.config.ts:17` — `schemaFilter: ['public']` guards against accidental
migration of neon_auth. `src/lib/db/access.ts` is the single permission layer.

The old Supabase schema enforced permissions with Postgres RLS policies that referenced
each other in a cycle (trips → trip_members → trips), which made every read fail with
`infinite recursion detected in policy` — including reads by the trip owner. The application
layer is both simpler and impossible to get into that cycle.

**Never reintroduce RLS policies on `trips`, `trip_days`, `stops`, `trip_members`.**

---

## 2. Postgres `numeric` returns as a string; always coerce

**Evidence**: `src/lib/db/schema.ts:49` (`budget_total`) and `:113` (`estimated_cost`) define
`numeric(...)`. `src/lib/db/serialize.ts:17-18` has a `num()` helper that handles the coercion.
Every arithmetic operation on costs (`trip.budget_total + stop.estimated_cost`) would otherwise
concatenate strings instead of adding numbers ("500" + "300" → "500300").

**Any code that reads a numeric column from the DB must use `num()` or `Number()`.**

---

## 3. The API wire format is snake_case

**Evidence**: `src/lib/db/serialize.ts` — every serializer maps Drizzle camelCase keys
(`dayTitle`, `startDate`) to snake_case (`day_title`, `start_date`) for the JSON response.
`src/app/(dashboard)/trip/[id]/page.tsx:172-173` reads `data.upvotes ?? 0` (snake_case).

The brief originally assumed camelCase throughout; fixing a batch of reads from `data.upvotes`
to `data.upvotes` (already correct) revealed there were no such reads — only hardcoded zeros.
This boundary is stable. Changing it requires updating every consumer atomically.

**Keep `serialize.ts` as the single conversion point. Never mix wire formats within a route.**

---

## 4. The neon_auth schema is read-only and excluded from migrations

**Evidence**: `drizzle.config.ts:17` — `schemaFilter: ['public']` means drizzle-kit will never
generate migrations touching the `neon_auth` namespace. `src/lib/db/auth-schema.ts` maps the
auth tables (read-only) for `SELECT ... LEFT JOIN auth_users` in the comments endpoint.
`src/lib/db/index.ts` does not include the auth schema in the drizzle instance.

If you need data from an auth table in an API route, use an explicit left join on
`authUsers` from `auth-schema.ts`. Do not add it to the drizzle instance.

**Never run migrations against `neon_auth` tables. Never add `authUsers` to `src/lib/db/index.ts`.**

---

## 5. Route protection lives in src/proxy.ts, not middleware.ts

**Evidence**: `src/proxy.ts` exports `matchesWebhookRoute`, `isAuthRoute`, `isProtectedRoute`,
and `withApiHandler` — the routing and auth logic for the Next.js 16 route convention.
`src/app/api/auth/[...neonauth]/route.ts` imports and re-exports from it.

Next.js 16 changed the middleware file convention. `middleware.ts` is not used.
If you need to recreate route protection, update `src/proxy.ts`, not a new `middleware.ts`.

---

# Known bugs (fixed, for reference)

These bugs were found and fixed in the current session. The patterns to avoid:

**Empty `catch {}` swallowing errors silently** — Three occurrences in `page.tsx` (votes load,
comment load, vote cast). Always at minimum log the error: `catch (err) { console.error('[context]', err) }`.

**Comments endpoint 500 due to missing relation** — `db.query.stopComments.findMany({ with: { profile: true } })`
failed because no `stopCommentsRelations` was defined. Fixed with an explicit leftJoin on
`authUsers` from `auth-schema.ts`.

**Optimistic vote counts drifting** — `castVote` optimistically updated `myVote` but not
`up`/`down`, then reverted the whole state on failure. The server now returns authoritative
counts on the POST response and the client adopts them.

---

# What's built vs. not built

Built and working:
- Trip CRUD, day CRUD, stop CRUD with reorder
- Votes and comments on stops (CRUD)
- Trip clone, public trip feed
- Offline save/restore with amber banner and Cloud badge
- Weather badge (Open-Meteo, no API key)
- ICS calendar export
- Geocoding (OpenStreetMap Nominatim, backfill script)
- Drag-to-reorder stops with DnD Kit
- Share dialog with join-via-link
- Share trip copy

Not yet connected to the UI (endpoints exist, no UI handlers):
- `POST /api/trips/:id/days` — day creation (the page uses a placeholder that calls it)
- `PATCH /api/trips/:id/days/:id` — day title/budget edits
- `DELETE /api/trips/:id/days/:id` — day deletion
- Stop edit dialog (`PATCH /api/trips/:id/stops/:id`)
- Stop geocode refresh button
