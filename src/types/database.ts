/**
 * API wire types.
 *
 * These describe the JSON the /api routes return (snake_case), not the Drizzle
 * row types — for those, import from `@/lib/db/schema`. The previous version of
 * this file was Supabase codegen output for a schema that no longer exists.
 */

export interface Profile {
  id: string
  full_name: string | null
  /** The user's email. Named `username` for backwards compatibility with the UI. */
  username: string | null
  avatar_url: string | null
}

export interface Stop {
  id: string
  day_id: string
  trip_id: string
  position: number
  place_name: string
  place_id: string | null
  category: string | null
  lat: number | null
  lng: number | null
  address: string | null
  start_time: string | null
  duration_minutes: number
  estimated_cost: number
  travel_time_from_prev: number
  travel_mode: string | null
  opening_hours: string | null
  notes: string | null
  is_visited: boolean
  is_skipped: boolean
}

export interface TripDay {
  id: string
  trip_id: string
  day_number: number
  date: string | null
  day_title: string | null
  notes: string | null
  stops: Stop[]
}

export type TripRole = 'owner' | 'editor' | 'viewer'

export interface Trip {
  id: string
  owner_id: string
  title: string
  destination: string
  destination_lat: number | null
  destination_lng: number | null
  start_date: string | null
  end_date: string | null
  budget_total: number
  currency: string
  travel_style: string | null
  interests: string[]
  group_size: number
  is_public: boolean
  share_token: string
  status: 'planning' | 'active' | 'completed'
  created_at: string
  trip_days: TripDay[]
  /** Present on single-trip and list responses. */
  role?: TripRole
  is_owner?: boolean
}

export interface TripMember {
  trip_id: string
  user_id: string
  role: TripRole
  joined_at: string | null
  profiles: Profile | null
}
