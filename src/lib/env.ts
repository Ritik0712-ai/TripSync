/**
 * Fail fast, and say what is actually missing.
 *
 * Both the auth client and the database pool are constructed at module load,
 * and Next.js imports those modules while collecting page data — so a missing
 * variable breaks the *build*, not just the running app. That is the right
 * behaviour (better than a site that deploys green and 500s on first use), but
 * the library errors are opaque: Neon Auth reports "Missing required config:
 * cookies.secret", which does not name the environment variable you forgot.
 *
 * This turns that into a message that says exactly which variable is missing
 * and where to set it.
 */
function required(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n\n` +
        `Locally, add it to .env.local (see .env.example).\n` +
        `On Vercel, set it under Settings -> Environment Variables, then redeploy.\n` +
        `Note that .env.local is not deployed — production reads only what is ` +
        `configured in the Vercel dashboard.`
    )
  }

  return value
}

export const env = {
  get DATABASE_URL() {
    return required('DATABASE_URL')
  },
  get NEON_AUTH_BASE_URL() {
    return required('NEON_AUTH_BASE_URL')
  },
  get NEON_AUTH_COOKIE_SECRET() {
    return required('NEON_AUTH_COOKIE_SECRET')
  },
}
