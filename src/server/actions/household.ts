"use server";

import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { aisle, household, householdToken, person } from "@/db/schema";
import { auth } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { type ActionResult, fail, ok } from "@/server/action-result";
import { getCtxOrNull, getSession, requireCtx } from "@/server/ctx";
import { saveRecipe } from "@/server/recipes/save";
import aisleNames from "../../../data/aisles-waitrose.json";
import starterBundles from "../../../data/bundles-starter.json";

const onboardingSchema = z.object({
  householdName: z.string().trim().min(1, "Give the household a name").max(60),
  yourName: z.string().trim().min(1, "What should we call you?").max(40),
  partnerName: z.string().trim().max(40).optional().or(z.literal("")),
});

export type OnboardingState = ActionResult<undefined> | null;

/** First sign-in: create the household, the manager's person and a virtual partner. */
export async function createHousehold(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (await getCtxOrNull()) redirect("/week");

  const parsed = onboardingSchema.safeParse({
    householdName: formData.get("householdName"),
    yourName: formData.get("yourName"),
    partnerName: formData.get("partnerName") ?? "",
  });
  if (!parsed.success)
    return fail("Check the form", z.flattenError(parsed.error).fieldErrors);
  const { householdName, yourName, partnerName } = parsed.data;

  await db.transaction(async (tx) => {
    const [h] = await tx
      .insert(household)
      .values({ name: householdName })
      .returning({ id: household.id });
    if (!h) throw new Error("household insert failed");
    const [me] = await tx
      .insert(person)
      .values({
        householdId: h.id,
        userId: session.user.id,
        displayName: yourName,
        role: "manager",
        sortOrder: 0,
      })
      .returning({ id: person.id });
    if (!me) throw new Error("person insert failed");
    if (partnerName) {
      await tx.insert(person).values({
        householdId: h.id,
        displayName: partnerName,
        role: "member",
        sortOrder: 1,
      });
    }
    // Seed the Waitrose aisle order and three starter set breakfasts so the first week can be planned at once.
    await tx.insert(aisle).values(
      aisleNames.map((name, position) => ({
        householdId: h.id,
        name,
        position,
      })),
    );
    for (const b of starterBundles) {
      await saveRecipe(
        tx,
        { householdId: h.id, personId: me.id },
        {
          kind: "bundle",
          title: b.title,
          servings: 1,
          mealTypes: b.mealTypes as ["breakfast"],
          tags: [],
          steps: [],
          lines: b.lines.map((l) => ({
            rawText: l.rawText,
            quantity: l.quantity,
            quantityMax: null,
            unit: l.unit,
            nameNormalised: l.name,
            preparation: null,
            isOptional: false,
            groupName: null,
          })),
        },
      );
    }
  });
  redirect("/week");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Manager creates a single-use invite link binding a login to an existing (virtual) person. */
export async function createInviteLink(
  personId: string,
): Promise<ActionResult<{ url: string }>> {
  const ctx = await requireCtx();
  if (ctx.role !== "manager")
    return fail("Only the household manager can invite");
  const [target] = await db
    .select()
    .from(person)
    .where(
      and(eq(person.id, personId), eq(person.householdId, ctx.householdId)),
    )
    .limit(1);
  if (!target) return fail("Person not found");
  if (target.userId) return fail(`${target.displayName} already has a login`);
  const token = newToken();
  await db.insert(householdToken).values({
    token,
    householdId: ctx.householdId,
    personId,
    kind: "invite",
    createdByUserId: ctx.userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  });
  return ok({ url: `${appUrl()}/invite/${token}` });
}

/** Manager creates a single-use password reset link for a member who has a login. */
export async function createResetLink(
  personId: string,
): Promise<ActionResult<{ url: string }>> {
  const ctx = await requireCtx();
  if (ctx.role !== "manager")
    return fail("Only the household manager can create reset links");
  const [target] = await db
    .select()
    .from(person)
    .where(
      and(eq(person.id, personId), eq(person.householdId, ctx.householdId)),
    )
    .limit(1);
  if (!target?.userId)
    return fail("That person has no login yet; send an invite instead");
  const token = newToken();
  await db.insert(householdToken).values({
    token,
    householdId: ctx.householdId,
    personId,
    kind: "reset",
    createdByUserId: ctx.userId,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
  });
  return ok({ url: `${appUrl()}/reset/${token}` });
}

export async function loadToken(token: string, kind: "invite" | "reset") {
  const [row] = await db
    .select({ token: householdToken, person, household })
    .from(householdToken)
    .innerJoin(person, eq(person.id, householdToken.personId))
    .innerJoin(household, eq(household.id, householdToken.householdId))
    .where(
      and(
        eq(householdToken.token, token),
        eq(householdToken.kind, kind),
        isNull(householdToken.usedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (row.token.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Signed-in user accepts an invite: links their login to the invited person. */
export async function acceptInvite(
  token: string,
): Promise<ActionResult<undefined>> {
  const session = await getSession();
  if (!session) return fail("Sign in first");
  if (await getCtxOrNull()) return fail("You already belong to a household");
  const row = await loadToken(token, "invite");
  if (!row) return fail("This invite link has expired or was already used");
  if (row.person.userId) return fail("This person already has a login");
  await db.transaction(async (tx) => {
    await tx
      .update(person)
      .set({ userId: session.user.id })
      .where(eq(person.id, row.person.id));
    await tx
      .update(householdToken)
      .set({ usedAt: new Date(), usedByUserId: session.user.id })
      .where(eq(householdToken.token, token));
  });
  redirect("/week");
}

const resetSchema = z.object({
  password: z.string().min(10, "At least 10 characters"),
});

/** Anyone holding a valid reset link sets a new password for that person's login. */
export async function resetPasswordWithToken(
  token: string,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const parsed = resetSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success)
    return fail("Check the form", z.flattenError(parsed.error).fieldErrors);
  const row = await loadToken(token, "reset");
  if (!row?.person.userId)
    return fail("This reset link has expired or was already used");
  const authCtx = await auth.$context;
  const hash = await authCtx.password.hash(parsed.data.password);
  await authCtx.internalAdapter.updatePassword(row.person.userId, hash);
  await db
    .update(householdToken)
    .set({ usedAt: new Date() })
    .where(eq(householdToken.token, token));
  redirect("/sign-in?reset=1");
}

/** useActionState-compatible wrappers (token travels in a hidden field). */
export async function acceptInviteForm(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
) {
  return acceptInvite(String(formData.get("token") ?? ""));
}

export async function resetPasswordForm(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
) {
  return resetPasswordWithToken(String(formData.get("token") ?? ""), formData);
}
