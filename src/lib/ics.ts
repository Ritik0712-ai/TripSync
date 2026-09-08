/**
 * Pure ICS (iCalendar) generator for trip stops.
 * No library needed — RFC 5545 format is simple text.
 */

function escapeICS(str: string | null | undefined): string {
  if (!str) return ''
  return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

function formatICSDate(dateStr: string | null, timeStr: string | null): string {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm
  if (!dateStr) return ''
  const d = dateStr.replace(/-/g, '')
  const t = timeStr ? timeStr.replace(/:/g, '') + '00' : '000000'
  return `${d}T${t}`
}

function addMinutes(timeStr: string | null, minutes: number): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const totalMinutes = h * 60 + m + minutes
  const nh = Math.floor(totalMinutes / 60) % 24
  const nm = totalMinutes % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@tripsync`
}

export interface ICSStop {
  place_name: string
  address: string | null
  start_time: string | null
  duration_minutes: number
  date: string // YYYY-MM-DD for the day this stop belongs to
  day_title?: string
}

export interface ICSTrip {
  title: string
  start_date: string | null
  days: Array<{
    day_title?: string
    stops: ICSStop[]
  }>
}

export function generateICS(trip: ICSTrip): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TripSync//NONSGML TripSync//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const day of trip.days) {
    for (const stop of day.stops) {
      if (!stop.start_time && !trip.start_date) continue

      const startDT = formatICSDate(stop.date, stop.start_time)
      const endDT = formatICSDate(stop.date, addMinutes(stop.start_time, stop.duration_minutes))
      const summary = `${day.day_title ? day.day_title + ': ' : ''}${escapeICS(stop.place_name)}`

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${generateUID()}`)
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
      if (startDT) lines.push(`DTSTART:${startDT}`)
      if (endDT) lines.push(`DTEND:${endDT}`)
      lines.push(`SUMMARY:${escapeICS(summary)}`)
      if (stop.address) lines.push(`LOCATION:${escapeICS(stop.address)}`)
      lines.push('END:VEVENT')
    }
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(trip: ICSTrip): void {
  const ics = generateICS(trip)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${trip.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
