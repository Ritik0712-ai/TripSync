import { auth } from '@/lib/auth/server'

export default auth.middleware({
  loginUrl: '/login',
})

export const config = {
  matcher: [
    // Everything except static assets. Route-level protection still happens in
    // the API routes themselves; this keeps the session cookie fresh.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
