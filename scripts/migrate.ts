import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

loadEnv({ path: [".env.local", ".env"], quiet: true });

/**
 * Runs Drizzle migrations. Deliberately a no-op on Vercel preview builds so a PR can never
 * migrate the production database; set LOCAL=1 for local/CI runs.
 */
async function main() {
  const isProd = process.env.VERCEL_ENV === "production";
  const isLocal = Boolean(process.env.LOCAL);
  if (!isProd && !isLocal) {
    console.log(
      `[migrate] skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}, LOCAL unset)`,
    );
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("[migrate] DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const db = drizzle({ client: pool });
    console.log(
      `[migrate] applying migrations (${isProd ? "production" : "local"})…`,
    );
    await migrate(db, { migrationsFolder: "src/db/migrations" });
    console.log("[migrate] done");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
