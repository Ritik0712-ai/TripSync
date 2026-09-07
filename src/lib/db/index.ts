import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

import * as schema from './schema'

// The WebSocket driver (rather than the HTTP one) is used deliberately: it is
// the only Neon driver that supports real interactive transactions, which we
// need when saving a trip + its days + its stops as one atomic unit.
// Node 22+ ships a global WebSocket, but Vercel/Render may run older runtimes.
if (!globalThis.WebSocket) {
  neonConfig.webSocketConstructor = ws
}

const globalForDb = globalThis as unknown as { pool?: Pool }

// Reuse the pool across hot reloads in dev so we don't leak connections.
const pool =
  globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL! })

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool

export const db = drizzle(pool, { schema })
export { schema }
