/**
 * Shared DB URL resolution for migrate.mjs, src/lib/db.ts, and auth.
 * Neon/Vercel often inject POSTGRES_URL (or a Prisma pool URL) instead of
 * DATABASE_URL — treat any of them as "use real Postgres".
 */
const URL_KEYS = [
  // node-postgres + Vercel: prefer Neon's direct (session) URL. The pooled
  // endpoint is PgBouncer transaction mode, which is a poor fit for writes and
  // multi-statement migrations.
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
];

/** @param {NodeJS.ProcessEnv} [env] */
export function readDatabaseUrl(env = process.env) {
  for (const key of URL_KEYS) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** @param {NodeJS.ProcessEnv} [env] */
export function isServerlessHost(env = process.env) {
  return Boolean(env.VERCEL || env.NETLIFY);
}
