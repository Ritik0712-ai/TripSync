/**
 * Read-only mapping of the `neon_auth` schema that Managed Better Auth owns.
 *
 * Neon creates and migrates these tables itself, so this file is deliberately
 * NOT included in drizzle.config.ts — drizzle-kit must never try to create,
 * alter or drop anything in here. It exists purely so we can JOIN against
 * users in our own queries with type safety.
 */
import { pgSchema, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'

export const neonAuth = pgSchema('neon_auth')

export const authUsers = neonAuth.table('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
})

export type AuthUser = typeof authUsers.$inferSelect
