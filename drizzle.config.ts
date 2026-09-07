import { config } from 'dotenv'
config({ path: '.env.local' })

import { defineConfig } from 'drizzle-kit'

if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error('DATABASE_URL_UNPOOLED is not set in .env.local')
}

export default defineConfig({
  // Only our own schema. `src/lib/db/auth-schema.ts` is intentionally excluded:
  // the neon_auth tables belong to Neon's Managed Better Auth, not to us.
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  // Guard rail: never let drizzle-kit touch the neon_auth schema.
  schemaFilter: ['public'],
  dbCredentials: {
    // Migrations must use the direct (non-pooled) connection.
    url: process.env.DATABASE_URL_UNPOOLED,
  },
})
