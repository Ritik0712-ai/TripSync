/**
 * iCalendar (.ics) generator — RFC 5545.
 *
 * Hand-rolled on purpose: the subset of the spec a trip itinerary needs is
 * small, and every library that does this pulls in a timezone database we
 * would never use.
 *
 * Times are written as FLOATING local time — no trailing `Z`, no `TZID`.
 * That is deliberate. A stop planned for 9am in Goa should read 9am on the
 * traveller's phone whether they imported the file from Delhi or from a
 * layover in Dubai. Anchoring to a timezone would shift every event by the
 * offset between where the trip is and where the phone thinks it is.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5545
 */

/** RFC 5545 §3.3.11 — escape backslash, semicolon, comma and newline. */
function escapeText(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * RFC 5545 §3.1 — content lines are capped at 75 octets, with the overflow
 * continued on the next line prefixed by a single space.
 *
 * The limit is in OCTETS, not characters, so a line is measured after UTF-8
 * encoding and never split in the middle of a multi-byte character — half of
 * a "—" or an emoji is not valid UTF-8 and some parsers reject the whole file.
 */
function foldLine(line: string): string {
  // TextEncoder/TextDecoder rather than Buffer: this module also runs in the
  // browser, where Buffer does not exist.
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line

  const decoder = new TextDecoder()
  const chunks: string[] = []
  let start = 0

  while (start < bytes.length) {
    // First chunk gets 75 octets; continuation lines lose one to the leading
    // space, so they get 74.
    const limit = chunks.length === 0 ? 75 : 74
    let end = Math.min(start + limit, bytes.length)

    // Walk back off a UTF-8 continuation byte (10xxxxxx) so we never cut a
    // multi-byte character in half — half a character is invalid UTF-8 and
    // some calendar clients reject the entire file.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end--
    }

    chunks.push(decoder.decode(bytes.subarray(start, end)))
    start = end
  }

  return chunks.join('\r\n ')
}

/** Local wall-clock date-time: YYYYMMDDTHHMMSS, no timezone marker. */
function formatLocal(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `T${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  )
}

/** Date only: YYYYMMDD, for all-day events. */
function formatDateOnly(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`
}

/** UTC stamp: YYYYMMDDTHHMMSSZ. Only DTSTAMP is absolute. */
function formatUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Combine a YYYY-MM-DD date with an optional HH:mm time into a real Date, so
 * adding a duration rolls over midnight, month ends and leap years correctly
 * instead of wrapping the clock and leaving DTEND before DTSTART.
 */
function toDate(dateStr: string, timeStr?: string | null): Date | null {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return null

  let hours = 0
  let minutes = 0
  if (timeStr) {
    const [h, min] = timeStr.split(':').map(Number)
    if (Number.isFinite(h)) hours = h
    if (Number.isFinite(min)) minutes = min
  }

  const date = new Date(y, m - 1, d, hours, minutes, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export interface ICSStop {
  /** Stop UUID. Used verbatim in the event UID so re-importing UPDATES the
   *  existing event instead of creating a duplicate. */
  id: string
  place_name: string
  address: string | null
  start_time: string | null
  duration_minutes: number | null
  notes?: string | null
  /** YYYY-MM-DD of the day this stop belongs to. */
  date: string
  day_title?: string | null
}

export interface ICSDay {
  day_title?: string | null
  date?: string | null
  stops: ICSStop[]
}

export interface ICSTrip {
  title: string
  start_date: string | null
  days: ICSDay[]
  /** Public trip URL, appended to each event's description when present. */
  url?: string | null
}

const DEFAULT_DURATION_MINUTES = 60

export function generateICS(trip: ICSTrip): string {
  const stamp = formatUTC(new Date())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TripSync//TripSync Itinerary//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(trip.title)}`,
  ]

  for (const day of trip.days) {
    for (const stop of day.stops) {
      const dateStr = stop.date || day.date || trip.start_date
      if (!dateStr) continue // genuinely undateable — nothing sensible to emit

      const start = toDate(dateStr, stop.start_time)
      if (!start) continue

      lines.push('BEGIN:VEVENT')
      // Stable and unique. Same stop re-exported => same UID => calendars
      // update the event in place rather than stacking duplicates.
      lines.push(`UID:${stop.id}@tripsync`)
      lines.push(`DTSTAMP:${stamp}`)

      if (stop.start_time) {
        const minutes = stop.duration_minutes ?? DEFAULT_DURATION_MINUTES
        const end = addMinutes(start, minutes > 0 ? minutes : DEFAULT_DURATION_MINUTES)
        lines.push(`DTSTART:${formatLocal(start)}`)
        lines.push(`DTEND:${formatLocal(end)}`)
      } else {
        // No time on the stop. An all-day event keeps it visible on the right
        // day instead of silently dropping it or pinning it to midnight.
        // DTEND is exclusive for VALUE=DATE, hence +1 day.
        lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(start)}`)
        lines.push(`DTEND;VALUE=DATE:${formatDateOnly(addDays(start, 1))}`)
      }

      lines.push(`SUMMARY:${escapeText(stop.place_name)}`)

      if (stop.address) lines.push(`LOCATION:${escapeText(stop.address)}`)

      const descriptionParts: string[] = []
      const dayLabel = stop.day_title || day.day_title
      if (dayLabel) descriptionParts.push(dayLabel)
      if (stop.notes) descriptionParts.push(stop.notes)
      if (trip.url) descriptionParts.push(trip.url)
      if (descriptionParts.length) {
        lines.push(`DESCRIPTION:${escapeText(descriptionParts.join('\n'))}`)
      }

      lines.push('END:VEVENT')
    }
  }

  lines.push('END:VCALENDAR')

  // Fold last, so escaping never pushes a line back over the octet limit.
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** Slug suitable for a filename: lowercase, alphanumerics and single dashes. */
export function icsFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'trip'}.ics`
}

export function downloadICS(trip: ICSTrip): void {
  const blob = new Blob([generateICS(trip)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = icsFileName(trip.title)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
