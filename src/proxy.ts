import { NextRequest, NextResponse } from 'next/server'
import {
  processAuthMiddleware,
  DEFAULT_AUTH_SKIP_ROUTES,
} from '@neondatabase/auth/server'

import { env } from '@/lib/env'

/**
 * Route protection. This is `proxy.ts`, not `middleware.ts` — Next.js 16
 * renamed the convention. Do not recreate middleware.ts.
 *
 * `/api/` is added to the skip list on purpose. Without it the middleware
 * answers unauthenticated API calls with `307 -> /login`, and a browser
 * `fetch()` cannot follow a redirect to an HTML page and still parse JSON —
 * the caller sees a confusing parse error instead of a 401. Every API route
 * does its own auth check via getCurrentUserId(), so skipping them here is
 * safe: it changes the failure mode from a redirect to a proper 401.
 *
 * Note on '/': the library matches a skip entry as "this exact path or a
 * subpath of it", but special-cases '/' to exact-match only. Listing it
 * un-protects the landing page without un-protecting the whole site.
 */
const SKIP_ROUTES = [
  ...DEFAULT_AUTH_SKIP_ROUTES,
  '/api/',
  // The library's defaults assume auth pages at /auth/sign-in and
  // /auth/sign-up. This app puts them at /login and /signup, so without these
  // entries the proxy redirects the sign-up page to the login page and a new
  // user can never create an account.
  '/',
  '/login',
  '/signup',
  '/join',
  // Public trip templates are the discovery surface — a stranger following a
  // shared link should land on the trip, not on a login wall. Cloning one
  // still requires an account; that check lives in the clone route.
  '/trips/public',
  // Trip pages are shells: they render nothing until GET /api/trips/:id
  // answers, and that route already refuses anything the caller cannot see.
  // Un-protecting the page lets a public trip be previewed signed out without
  // widening what the API will hand over — a private trip still 404s here.
  '/trip',
]

export default async function proxy(request: NextRequest) {
  const result = await processAuthMiddleware({
    request,
    pathname: request.nextUrl.pathname,
    skipRoutes: SKIP_ROUTES,
    loginUrl: '/login',
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookieSecret: env.NEON_AUTH_COOKIE_SECRET,
  })

  switch (result.action) {
    case 'redirect_oauth':
    case 'redirect_login': {
      const headers = new Headers()
      for (const cookie of result.cookies ?? []) {
        headers.append('Set-Cookie', cookie)
      }
      return NextResponse.redirect(result.redirectUrl, { headers })
    }

    case 'allow':
    default: {
      // Default-allow: an unrecognised action must not silently return
      // undefined, which Next treats as a broken middleware response.
      const headers = new Headers(request.headers)
      for (const [key, value] of Object.entries(result.headers ?? {})) {
        headers.set(key, value)
      }
      const response = NextResponse.next({ request: { headers } })
      for (const cookie of result.cookies ?? []) {
        response.headers.append('Set-Cookie', cookie)
      }
      return response
    }
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
