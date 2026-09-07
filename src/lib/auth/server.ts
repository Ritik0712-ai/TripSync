import { createNeonAuth } from '@neondatabase/auth/next/server'

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
})

/**
 * Returns the signed-in user's id, or null. Every API route starts with this.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: session } = await auth.getSession()
  return session?.user?.id ?? null
}

/**
 * Returns the signed-in user, or null.
 */
export async function getCurrentUser() {
  const { data: session } = await auth.getSession()
  return session?.user ?? null
}
