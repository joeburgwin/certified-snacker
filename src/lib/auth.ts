import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { appUrl, getEnv } from "@/lib/env";

const env = getEnv();
const isProd = env.VERCEL_ENV === "production";

/**
 * better-auth owns user/session/account/verification. The domain identity is `person`
 * (see src/db/schema/household.ts); a user links to exactly one person via person.user_id.
 */
export const auth = betterAuth({
  appName: "Certified Snacker",
  baseURL: appUrl(),
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 60, // 60 days: a household app on your own devices
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // Preview deployments live on *.vercel.app; production uses the canonical URL only.
  trustedOrigins: isProd
    ? [
        "https://certified-snacker.vercel.app",
        "https://certified-snacker-burgwin.vercel.app",
      ]
    : ["https://*.vercel.app", "http://localhost:3000"],
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
