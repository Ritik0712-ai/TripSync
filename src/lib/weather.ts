/**
 * Open-Meteo free weather API.
 * No API key required. Rate-limited to ~10k calls/month — cache aggressively.
 * Commercial use requires a paid plan — noted in PR.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

interface WeatherResponse {
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    precipitation_probability_max: number[]
    wind_speed_10m_max: number[]
  }
}

export interface DayWeather {
  date: string // YYYY-MM-DD
  code: number
  description: string
  tempHigh: number
  tempLow: number
  precipitationMm: number
  precipitationChance: number
  windMax: number
  icon: string
}

const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: '☀️' },
  1: { description: 'Mainly clear', icon: '🌤️' },
  2: { description: 'Partly cloudy', icon: '⛅' },
  3: { description: 'Overcast', icon: '☁️' },
  45: { description: 'Foggy', icon: '🌫️' },
  48: { description: 'Rime fog', icon: '🌫️' },
  51: { description: 'Light drizzle', icon: '🌧️' },
  53: { description: 'Moderate drizzle', icon: '🌧️' },
  55: { description: 'Dense drizzle', icon: '🌧️' },
  61: { description: 'Light rain', icon: '🌧️' },
  63: { description: 'Moderate rain', icon: '🌧️' },
  65: { description: 'Heavy rain', icon: '🌧️' },
  71: { description: 'Light snow', icon: '🌨️' },
  73: { description: 'Moderate snow', icon: '🌨️' },
  75: { description: 'Heavy snow', icon: '🌨️' },
  80: { description: 'Light showers', icon: '🌦️' },
  81: { description: 'Moderate showers', icon: '🌦️' },
  82: { description: 'Heavy showers', icon: '⛈️' },
  95: { description: 'Thunderstorm', icon: '⛈️' },
  96: { description: 'Thunderstorm + hail', icon: '⛈️' },
  99: { description: 'Thunderstorm + heavy hail', icon: '⛈️' },
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour — forecasts do not move faster

/**
 * In-memory forecast cache, keyed by rounded coordinates.
 *
 * This function runs in the browser (TripWeather is a client component), where
 * Next's `next: { revalidate }` fetch option is silently ignored — it is a
 * server-only directive. Without a cache of our own, every mount and every tab
 * revisit spent another call against Open-Meteo's ~10k/month free allowance.
 *
 * Coordinates are rounded to ~1 km, since a forecast does not differ
 * meaningfully across a city and rounding turns near-identical trips into
 * cache hits.
 */
const forecastCache = new Map<string, { at: number; data: Map<string, DayWeather> }>()
const inFlight = new Map<string, Promise<Map<string, DayWeather>>>()

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`
}

// Max forecast horizon is ~16 days. Dates beyond that are simply absent.
export async function fetchWeather(
  lat: number,
  lng: number,
  dates: string[]
): Promise<Map<string, DayWeather>> {
  if (!dates.length) return new Map()

  const key = cacheKey(lat, lng)
  const wanted = (all: Map<string, DayWeather>) => {
    const out = new Map<string, DayWeather>()
    for (const d of dates) {
      const hit = all.get(d)
      if (hit) out.set(d, hit)
    }
    return out
  }

  const cached = forecastCache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return wanted(cached.data)

  // Two components mounting at once must not fire two identical requests.
  const pending = inFlight.get(key)
  if (pending) return wanted(await pending)

  const request = fetchForecast(lat, lng)
  inFlight.set(key, request)

  try {
    const all = await request
    forecastCache.set(key, { at: Date.now(), data: all })
    return wanted(all)
  } finally {
    inFlight.delete(key)
  }
}

/** Fetches the full 16-day forecast for a location, keyed by YYYY-MM-DD. */
async function fetchForecast(lat: number, lng: number): Promise<Map<string, DayWeather>> {
  const result = new Map<string, DayWeather>()

  try {
    const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=16`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const data: WeatherResponse = await res.json()

    for (let i = 0; i < data.daily.time.length; i++) {
      const date = data.daily.time[i]
      const code = data.daily.weather_code[i]
      const info = WEATHER_CODES[code] ?? { description: 'Unknown', icon: '🌡️' }
      result.set(date, {
        date,
        code,
        description: info.description,
        icon: info.icon,
        tempHigh: data.daily.temperature_2m_max[i],
        tempLow: data.daily.temperature_2m_min[i],
        precipitationMm: data.daily.precipitation_sum[i],
        precipitationChance: data.daily.precipitation_probability_max[i],
        windMax: data.daily.wind_speed_10m_max[i],
      })
    }
  } catch (err) {
    console.error('[weather] fetch failed:', err)
  }

  return result
}

export function getWeatherIcon(code: number): string {
  return WEATHER_CODES[code]?.icon ?? '🌡️'
}
