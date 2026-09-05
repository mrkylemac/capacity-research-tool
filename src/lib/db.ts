import { Pool } from 'pg';

/**
 * Postgres connection pool, shared across the app.
 *
 * Next.js hot-reloads modules in development, which would otherwise leak a new
 * pool on every reload, so the instance is cached on `globalThis`.
 *
 * Pool sizing follows the Fly Managed Postgres client guidance: cap idle
 * connections at 5 minutes and total connection lifetime at 10 minutes so
 * serverless instances never hold a connection the database has already
 * reaped.
 */
declare global {
  var __slowfolkPgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Deliberately not thrown at import time — the build step imports this
    // module without needing a live database. The first query will surface it.
    console.warn('[db] DATABASE_URL is not set — database queries will fail.');
  }

  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 300_000,
    maxLifetimeSeconds: 600,
  });
}

export const pool: Pool = globalThis.__slowfolkPgPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__slowfolkPgPool = pool;
}
