# TripSync — Implementation Plan

Phase numbers below follow the PRD, not an independent scheme.

---

## Where the project actually stands

### Working and verified
- Auth — email/password and Google, via Neon Managed Better Auth
- Trip CRUD, AI itinerary generation (Groq primary, Gemini fallback)
- Share links, joining a trip, collaborator roles
- **Day and stop CRUD** — add, edit, reorder within and across days, delete
- Permission model — owner / editor / viewer, enforced in `src/lib/db/access.ts`

Last verified end to end over real HTTP against the live database: 34 checks,
0 failures, covering CRUD, cross-day reordering, day renumbering after a
delete, numeric coercion, cross-trip access attempts and viewer rejection.

### Not built
- UI for the editing endpoints — the API exists, nothing calls it
- Public read-only share view
- Map, geocoding, drag-to-reorder (PRD Phase 2)
- Votes, comments, journal (PRD Phases 3–4; schema-only by choice)

---

## Next — wire the editing UI

The endpoints are done and tested; this is presentation only.

**Changes**
- `src/app/(dashboard)/trip/[id]/page.tsx` — an edit-mode toggle rather than a
  separate `/edit` route. Inline add / edit / delete for stops, up-down buttons
  for ordering, editable day titles. When drag-and-drop lands with the map it
  replaces the buttons in place and calls the same endpoints, so none of this
  is throwaway.
- "Edit Trip" — trip metadata (title, dates, budget, status) through the
  existing `PATCH /api/trips/:id`. No new endpoint needed.
- "Open in Maps" — `https://www.google.com/maps/search/?api=1&query=` with the
  place name and address. Works without coordinates, so it does not wait on
  geocoding. Use `lat`/`lng` when present.
- Remove the unused `MoreHorizontal` and `ExternalLink` imports on the
  dashboard.

**Risk**: reorder calls must send the complete arrangement for every day they
touch, or the endpoint rejects them with 400. Keep client state authoritative
and send the whole day.

**Verify**: add, edit, reorder and delete a stop in the browser; sign in as a
viewer and confirm the controls are hidden and the API refuses.

---

## Then — public share view

A read-only page anyone can open without an account, gated on
`trips.is_public`, with "clone this trip" for signed-in visitors.
`getTripAccess` already returns `canView: true` for a public trip with a null
user, so the route handler needs no change — only the page.

**Decision needed**: today the authenticated trip page lives at `/trip/:id`.
The public page can either take that URL and move the authenticated one, or sit
at a separate path. Moving it changes dashboard links; a separate path
duplicates the itinerary rendering. Prefer extracting the itinerary into a
shared component and letting both pages use it.

---

## Then — the map (PRD Phase 2)

Leaflet with OpenStreetMap tiles, Nominatim for geocoding stop names into the
`lat`/`lng` columns that already exist. Numbered markers, per-day colours and
routes, click a pin for detail; split view on desktop, tabs on mobile. Then
drag-to-reorder, replacing the up-down buttons and calling
`PATCH /api/trips/:id/stops/reorder`.

Leaflet needs `window`, so load it with `dynamic(..., { ssr: false })`.

This is the biggest visual payoff and the clearest differentiator in the PRD.

---

## Then — ship (PRD Phase 5)

- Own Google OAuth credentials. The authorized redirect URI is
  `{NEON_AUTH_BASE_URL}/callback/google` — the Neon auth host, **not** the app
  URL. Confusing the two is the standard `redirect_uri_mismatch`.
- Trusted domains for the production origin, set in the Neon Console. Currently
  empty, which is fine for localhost only.
- Every value in `.env.local` re-entered in the Vercel dashboard. `.env.local`
  is not deployed, and a missing `DATABASE_URL` or `NEON_AUTH_COOKIE_SECRET`
  fails at runtime, not at build.
- Update the README's Status section to match reality.

---

## Deferred on purpose

`stop_votes` and `stop_comments` are group-planning features that only mean
something once several people share a trip. `journal_entries` is the mid-trip
companion. All three are schema-only until there are real users — empty tables
here are a decision, not an oversight.

---

## Open questions

1. **Share token rotation** — tokens are valid forever with no way to
   invalidate a leaked one. Acceptable for now; a "regenerate link" action is
   the fix when it matters.
2. **Currency** — stored per trip with no conversion, which is deliberate: one
   trip has one currency, so there is nothing to convert between. Revisit only
   if a single trip ever needs mixed currencies.
3. **Auth schema drift** — `neon_auth` is managed by Neon and Managed Better
   Auth is beta. There is no migration strategy if Neon changes that schema.
   `src/lib/db/auth-schema.ts` reads only `id`, `name`, `email` and `image`, so
   the exposure is small, but it is not zero.
