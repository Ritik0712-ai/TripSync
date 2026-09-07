/**
 * TripSync database schema (Drizzle ORM / Neon Postgres).
 *
 * Note on permissions: there are deliberately NO row-level security policies
 * here. Every query runs through our own API routes as the database owner, and
 * ownership / membership is checked in code (see src/lib/db/access.ts). The
 * previous Supabase schema enforced this with RLS and the policies referenced
 * each other in a cycle, which made every read fail with
 * "infinite recursion detected in policy". Checking in the API layer is both
 * simpler and impossible to get into that state.
 *
 * User identity lives in `neon_auth.user`, managed by Neon. We store the user's
 * uuid here without a hard foreign key: `neon_auth` is a managed (beta) schema
 * and we don't want our constraints to block Neon's own migrations.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  date,
  time,
  timestamp,
  doublePrecision,
  primaryKey,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'

/* -------------------------------------------------------------------------- */
/* trips                                                                      */
/* -------------------------------------------------------------------------- */

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull(),
    title: text('title').notNull(),
    destination: text('destination').notNull(),
    destinationLat: doublePrecision('destination_lat'),
    destinationLng: doublePrecision('destination_lng'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    budgetTotal: numeric('budget_total', { precision: 12, scale: 2 }).default('0'),
    currency: text('currency').default('INR').notNull(),
    travelStyle: text('travel_style'),
    interests: text('interests').array(),
    groupSize: integer('group_size').default(1).notNull(),
    isPublic: boolean('is_public').default(false).notNull(),
    shareToken: text('share_token')
      .notNull()
      .default(sql`gen_random_uuid()::text`),
    status: text('status').default('planning').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('trips_share_token_key').on(t.shareToken),
    index('trips_owner_id_idx').on(t.ownerId),
    check('trips_status_check', sql`${t.status} in ('planning','active','completed')`),
  ]
)

/* -------------------------------------------------------------------------- */
/* trip_days                                                                  */
/* -------------------------------------------------------------------------- */

export const tripDays = pgTable(
  'trip_days',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    dayNumber: integer('day_number').notNull(),
    date: date('date'),
    dayTitle: text('day_title'),
    notes: text('notes'),
  },
  (t) => [
    index('trip_days_trip_id_idx').on(t.tripId),
    uniqueIndex('trip_days_trip_id_day_number_key').on(t.tripId, t.dayNumber),
  ]
)

/* -------------------------------------------------------------------------- */
/* stops                                                                      */
/* -------------------------------------------------------------------------- */

export const stops = pgTable(
  'stops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dayId: uuid('day_id')
      .notNull()
      .references(() => tripDays.id, { onDelete: 'cascade' }),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    placeName: text('place_name').notNull(),
    placeId: text('place_id'),
    category: text('category'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    address: text('address'),
    startTime: time('start_time'),
    durationMinutes: integer('duration_minutes').default(60),
    estimatedCost: numeric('estimated_cost', { precision: 12, scale: 2 }).default('0'),
    travelTimeFromPrev: integer('travel_time_from_prev'),
    travelMode: text('travel_mode'),
    openingHours: text('opening_hours'),
    notes: text('notes'),
    isVisited: boolean('is_visited').default(false).notNull(),
    isSkipped: boolean('is_skipped').default(false).notNull(),
  },
  (t) => [index('stops_day_id_idx').on(t.dayId), index('stops_trip_id_idx').on(t.tripId)]
)

/* -------------------------------------------------------------------------- */
/* trip_members                                                               */
/* -------------------------------------------------------------------------- */

export const tripMembers = pgTable(
  'trip_members',
  {
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: text('role').default('viewer').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tripId, t.userId] }),
    index('trip_members_user_id_idx').on(t.userId),
    check('trip_members_role_check', sql`${t.role} in ('owner','editor','viewer')`),
  ]
)

/* -------------------------------------------------------------------------- */
/* stop_votes / stop_comments / journal_entries                               */
/* -------------------------------------------------------------------------- */

export const stopVotes = pgTable(
  'stop_votes',
  {
    stopId: uuid('stop_id')
      .notNull()
      .references(() => stops.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    vote: integer('vote').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.stopId, t.userId] }),
    check('stop_votes_vote_check', sql`${t.vote} in (1, -1)`),
  ]
)

export const stopComments = pgTable(
  'stop_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stopId: uuid('stop_id')
      .notNull()
      .references(() => stops.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('stop_comments_stop_id_idx').on(t.stopId)]
)

export const journalEntries = pgTable(
  'journal_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    stopId: uuid('stop_id').references(() => stops.id, { onDelete: 'set null' }),
    userId: uuid('user_id').notNull(),
    content: text('content'),
    photos: text('photos').array(),
    rating: integer('rating'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('journal_entries_trip_id_idx').on(t.tripId),
    check('journal_entries_rating_check', sql`${t.rating} between 1 and 5`),
  ]
)

/* -------------------------------------------------------------------------- */
/* relations                                                                  */
/* -------------------------------------------------------------------------- */

export const tripsRelations = relations(trips, ({ many }) => ({
  days: many(tripDays),
  stops: many(stops),
  members: many(tripMembers),
}))

export const tripDaysRelations = relations(tripDays, ({ one, many }) => ({
  trip: one(trips, { fields: [tripDays.tripId], references: [trips.id] }),
  stops: many(stops),
}))

export const stopsRelations = relations(stops, ({ one, many }) => ({
  day: one(tripDays, { fields: [stops.dayId], references: [tripDays.id] }),
  trip: one(trips, { fields: [stops.tripId], references: [trips.id] }),
  votes: many(stopVotes),
  comments: many(stopComments),
}))

export const tripMembersRelations = relations(tripMembers, ({ one }) => ({
  trip: one(trips, { fields: [tripMembers.tripId], references: [trips.id] }),
}))

/* -------------------------------------------------------------------------- */
/* inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type Trip = typeof trips.$inferSelect
export type NewTrip = typeof trips.$inferInsert
export type TripDay = typeof tripDays.$inferSelect
export type NewTripDay = typeof tripDays.$inferInsert
export type Stop = typeof stops.$inferSelect
export type NewStop = typeof stops.$inferInsert
export type TripMember = typeof tripMembers.$inferSelect
export type TripRole = 'owner' | 'editor' | 'viewer'
