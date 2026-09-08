/**
 * Open-Meteo free weather API.
 * No API key required. Rate-limited to ~10k calls/month — cache aggressively.
 * Commercial use requires a paid plan — noted in PR.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

interface OpenMeteoDay {
  time: string
  weather_code: number
  temperature_2m_max: number
  temperature_2m_min: number
  precipitation_sum: number
  precipitation_probability_max: number
  wind_speed_10m_max: number
}

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

// Max forecast horizon is ~16 days. Returns null for dates beyond that.
export async function fetchWeather(
  lat: number,
  lng: number,
  dates: string[]
): Promise<Map<string, DayWeather>> {
  if (!dates.length) return new Map()

  const result = new Map<string, DayWeather>()

  try {
    const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=16`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const data: WeatherResponse = await res.json()

    for (let i = 0; i < data.daily.time.length; i++) {
      const date = data.daily.time[i]
      if (!dates.includes(date)) continue
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
