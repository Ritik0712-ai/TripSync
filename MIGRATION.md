# Supabase → Neon migration

Done on 7 Sept 2026. The old Supabase project (`wrmvrgwqzoagsmgbuzoq`) no longer
exists — its DNS doesn't even resolve — so nothing was migrated across; this is
a clean rebuild of the data layer against a fresh database.

## What you need to run once

```bash
npm install
npm run dev
```

That's it. The Neon project, the auth service and all seven tables already exist.

## New stack

| Layer    | Before                    | Now                                        |
| -------- | ------------------------- | ------------------------------------------ |
| Database | Supabase Postgres         | Neon Postgres (`TripSync`, ap-southeast-1) |
| Access   | Supabase JS client        | Drizzle ORM                                |
| Auth     | Supabase Auth             | Neon Managed Better Auth (beta)            |
| Identity | `public.profiles`         | `neon_auth.user`                           |

## Files

```
src/lib/db/schema.ts        table definitions (source of truth)
src/lib/db/index.ts         drizzle client (WebSocket driver, real transactions)
src/lib/db/access.ts        who can view/edit a trip  ← replaces RLS
src/lib/db/serialize.ts     rows → the snake_case JSON the UI already reads
src/lib/db/auth-schema.ts   read-only view of neon_auth, for joins
src/lib/auth/server.ts      server-side auth + getCurrentUserId()
src/lib/auth/client.ts      browser auth client
src/proxy.ts                was middleware.ts (Next 16 renamed it)
drizzle.config.ts           migrations config
```

Old Supabase files are parked in `_legacy_supabase/` and `*.bak`. Delete them
once you're happy everything works.

## Why there is no RLS

The old `schema.sql` had a policy cycle: the `trips` SELECT policy queried
`trip_members`, and the `trip_members` SELECT policy queried `trips`. Postgres
answers that with:

```
ERROR: infinite recursion detected in policy for relation "trips"
```

…on every single read, for the owner too, not just collaborators. Because every
query in this app already goes through our own API routes, permissions are now
checked in `src/lib/db/access.ts` instead. One function, one definition of who
can see what, and no way to get back into that state.

## Things to do before deploying

1. **Trusted domains.** Add your Vercel URL in the Neon Console under
   Branch → Auth → Configuration, or OAuth redirects will be rejected.
2. **Your own Google OAuth credentials.** Right now sign-in uses Neon's shared
   development credentials. For production, create a Google OAuth client and set
   the authorized redirect URI to:
   `{NEON_AUTH_BASE_URL}/callback/google`
3. **Rotate the DB password** if this repo ever goes public — the connection
   string in `.env.local` is a live credential.

## Known gaps (unchanged by this migration)

- No map, no geocoding, no drag-to-reorder — PRD Phase 2 was never built.
- No per-stop edit/delete endpoints, so a saved itinerary can't be modified yet.
- `stop_votes`, `stop_comments` and `journal_entries` exist as tables but no code
  touches them.
- "Edit Trip" and "Open in Maps" buttons on the trip page still do nothing.
