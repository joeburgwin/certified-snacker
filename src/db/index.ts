import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * One `pg` Pool per process: works against Neon (plain TCP, pooled endpoint) in production
 * and against the local Postgres 16 cluster in development/tests.
 * attachDatabasePool lets Vercel Fluid compute close idle clients before suspending.
 */
const globalForDb = globalThis as unknown as { __snackerPool?: Pool };

function createPool(): Pool {
  const pool = new Pool({
    connectionString: getEnv().DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on("error", (err) => {
    console.error("[db] idle client error", err);
  });
  attachDatabasePool(pool);
  return pool;
}

if (!globalForDb.__snackerPool) {
  globalForDb.__snackerPool = createPool();
}
export const pool: Pool = globalForDb.__snackerPool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
