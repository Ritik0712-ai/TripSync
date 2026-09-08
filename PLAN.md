# TripSync — Implementation Plan

This is a phased plan. Each phase is independently shippable and reviewable.
Phases 1–5 are connectivity fixes (something is broken); Phases 6–8 are
features. Skipping phases or merging them is the main risk.

---

## Before you start

Run `npx tsc --noEmit && npm run build` to establish a clean baseline.
Commit that baseline separately so any regression is caught immediately.

---

## Phase 1 — Stop edit dialog

**What changes:** The `editingStop` state is set when the edit button is clicked but
nothing renders a dialog. Connect the existing dialog to pre-fill and save.

**Files:**
- `src/app/(dashboard)/trip/[id]/page.tsx` — open dialog when `editingStop !== null`,
  pre-fill fields from the stop, call `mutate()` with `PATCH` on save
- `src/app/api/trips/[id]/stops/[stopId]/route.ts` — verify PATCH accepts
  `{ place_name, start_time, duration_minutes, notes, category, is_visited, is_skipped }`

**What could break:** Stale state — call `loadTrip()` after a successful edit so the
local state reflects the server.

**Verify:** Edit a stop's duration, save, hard-refresh — value persists.

---

## Phase 2 — Day management UI

**What changes:** `addDay()`, `deleteDay()`, `saveDayTitle()` are defined but do nothing.
Wire them to the existing API endpoints.

**Files:**
- `src/app/(dashboard)/trip/[id]/page.tsx` — wire each function to the respective
  endpoint; confirm `POST /api/trips/:id/days`, `PATCH /api/trips/:id/days/:id`,
  `DELETE /api/trips/:id/days/:id` handlers exist and work
- Day selector: after adding a day, set `selectedDay` to the new day index.
  After deleting, clamp `selectedDay` to the new array bounds.

**What could break:** Deleting a day with stops — schema cascades on `day_id`, but
verify in a test. Day date conflicts — a future extension is auto-calculating dates
from `start_date`; this phase doesn't change that.

**Verify:** Create a day, rename it, delete it — dashboard reflects all three.

---

## Phase 3 — Geocode refresh in stop dialog

**What changes:** When a stop's `place_name` or `address` is edited, kick off a
geocode request. Show a spinner in the dialog while geocoding; update lat/lng on
resolve.

**Files:**
- `src/app/(dashboard)/trip/[id]/page.tsx` — in the stop dialog save handler,
  call `geocodeByQuery(placeName)` if lat/lng are empty or the name changed
- `src/lib/geocode.ts` — `geocodeByQuery(query)` already exists; verify it
  returns `{ lat, lng } | null`

**What could break:** Rate limits — Nominatim allows 1 req/s. Add a debounce if
the user rapidly edits. The backfill script (`scripts/backfill-geocode.ts`) is the
model for safe batching.

**Verify:** Edit a stop's place name, save, check that lat/lng are populated in the DB.

---

## Phase 4 — Trip settings page

**What changes:** The gear icon opens a `settingsOpen` state but renders nothing.
Build a dedicated settings panel for budget, currency, travel style, interests.

**Files:**
- `src/app/(dashboard)/trip/[id]/page.tsx` — replace the empty settings placeholder
  with a form: budget total, currency selector, travel style, interests (multi-select)
  — all editable by the trip owner
- `src/app/api/trips/[id]/route.ts` — PATCH handler already exists; verify it
  accepts all fields

**What could break:** Interacting with the in-page edit mode — decide whether the
settings panel is accessible in edit mode or only when not editing. Document the
decision.

**Verify:** Change the trip budget, refresh, budget persists.

---

## Phase 5 — Comment sheet with reply UI

**What changes:** `postComment` sends the comment but the sheet never closes and
the comment list never re-loads after posting. The comment sheet also lacks an
author avatar.

**Files:**
- `src/app/(dashboard)/trip/[id]/page.tsx` — close the sheet after a successful
  POST (`setCommentSheetOpen(false)`), reload `loadCommentData` for that stop,
  reset `newComment` to empty
- Add `author_image` and `author_name` to the comment list render in the sheet
- `src/app/api/trips/[id]/stops/comments/route.ts` — GET now returns
  `author_name` and `author_image` via explicit `leftJoin` on `authUsers`.
  The `StopComment` interface in the page has been updated to match.

**What could break:** Author attribution — `authUsers` is a Neon-managed table. If
the user deletes their Google account, `name` and `image` may be null. The page
falls back to `'Unknown'`. This is correct behavior; do not crash on null.

**Verify:** Post a comment, sheet closes, comment appears in the list below the stop.

---

## Phase 6 — Public trip share view (no auth required)

**What changes:** Share links go to `/join`, which forces sign-in. Someone with a
share token who is not signed in should see a read-only view.

**Files:**
- `src/app/(dashboard)/join/page.tsx` — check for `share_token` in URL params.
  If present and the user is not signed in, show a read-only trip card with a
  "Sign in to edit" CTA instead of the join form.
- Or: create `src/app/(dashboard)/s/[token]/page.tsx` — a dedicated read-only view
  that reads `GET /api/trips?share_token=xxx` (new endpoint) without requiring auth.
- `src/app/api/trips/[id]/route.ts` — add GET by share token, returning the same
  shape but without sensitive fields.

**What could break:** Privacy — ensure no PATCH/DELETE is accessible via the share
token. The `getTripAccess` function already handles this for signed-in viewers;
the public token path must be explicitly reviewed.

**Verify:** Open a share link in an incognito window, see the trip without signing in.

---

## Phase 7 — Trip search on the public page

**What changes:** `GET /api/trips/public` returns all public trips without filtering.
Add a `?q=` query param and a search input on the public browse page.

**Files:**
- `src/app/api/trips/[id]/public/route.ts` — add `ilike` filter on `title` and
  `destination` when `q` param is present
- `src/app/(dashboard)/trips/public/page.tsx` — add a `<input>` or shadcn `Input`
  for the search query, debounced, updates the fetch URL

**What could break:** SQL injection — use Drizzle's `like()`/`ilike()` helpers,
never template literals. Performance — add a GIN index on `title` if not present.

**Verify:** Type "Paris", only Paris trips appear. Clear the input, all trips return.

---

## Phase 8 — Email invite to a trip

**What changes:** The share dialog can copy a link but cannot send an email invite.

**Files:**
- `src/app/api/trips/[id]/invite/route.ts` — `POST` that accepts `{ email }`,
  looks up the user by email (or creates a pending invite record), and sends
  an email via Resend/Postmark/SendGrid.
- The email template links to the share URL with a one-time RSVP token.
- The join flow accepts the RSVP token and auto-adds the user to `trip_members`.

**What could break:** Email deliverability — use a transactional email service,
never `nodemailer` with a raw SMTP connection. Rate limits — one invite per email
per trip per day.

**What is uncertain:** Which email service? Resend has a free tier and Next.js
integration. If TripSync is entirely self-hosted, `mailto:` links are an
acceptable interim (opens the user's email client, pre-filled). Flag this decision.

**Verify:** Send an invite to a test email, find the email, click the link,
land on the trip with viewer access.
