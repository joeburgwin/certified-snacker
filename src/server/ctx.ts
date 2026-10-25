import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { type Household, household, type Person, person } from "@/db/schema";
import { auth } from "@/lib/auth";

/** The request context every query and action runs under. person.id is the domain identity. */
export type Ctx = {
  userId: string;
  email: string;
  householdId: string;
  personId: string;
  role: Person["role"];
  household: Household;
  person: Person;
};

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export const getCtxOrNull = cache(async (): Promise<Ctx | null> => {
  const session = await getSession();
  if (!session) return null;
  const rows = await db
    .select({ person, household })
    .from(person)
    .innerJoin(household, eq(household.id, person.householdId))
    .where(eq(person.userId, session.user.id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    userId: session.user.id,
    email: session.user.email,
    householdId: row.household.id,
    personId: row.person.id,
    role: row.person.role,
    household: row.household,
    person: row.person,
  };
});

/** For pages and actions inside the app: redirects to sign-in or onboarding when needed. */
export async function requireCtx(): Promise<Ctx> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const ctx = await getCtxOrNull();
  if (!ctx) redirect("/onboarding");
  return ctx;
}

/** A manager may act for anyone in the household; everyone may act for themselves. Cycle data is excluded elsewhere. */
export function canEditPerson(
  ctx: Ctx,
  target: Pick<Person, "id" | "householdId">,
): boolean {
  if (target.householdId !== ctx.householdId) return false;
  if (target.id === ctx.personId) return true;
  return ctx.role === "manager";
}
