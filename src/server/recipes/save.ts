import { and, eq, inArray } from "drizzle-orm";
import type { Tx } from "@/db";
import { aisle, ingredient, recipe, recipeIngredient } from "@/db/schema";
import { guessAisle } from "@/domain/aisles";
import { lineKey, nameKey } from "@/domain/normalise";
import type { RecipeInput } from "./schema";

export type SaveCtx = { householdId: string; personId: string };

/** Find or create the household ingredient for a name; new ones get a guessed aisle. */
export async function ensureIngredient(
  tx: Tx,
  householdId: string,
  name: string,
): Promise<{ id: string; aisleId: string | null }> {
  const key = nameKey(name) || name.trim().toLowerCase();
  const [existing] = await tx
    .select({ id: ingredient.id, aisleId: ingredient.aisleId })
    .from(ingredient)
    .where(
      and(eq(ingredient.householdId, householdId), eq(ingredient.nameKey, key)),
    )
    .limit(1);
  if (existing) return existing;
  let aisleId: string | null = null;
  const guessed = guessAisle(key);
  if (guessed) {
    const [a] = await tx
      .select({ id: aisle.id })
      .from(aisle)
      .where(and(eq(aisle.householdId, householdId), eq(aisle.name, guessed)))
      .limit(1);
    aisleId = a?.id ?? null;
  }
  const [created] = await tx
    .insert(ingredient)
    .values({ householdId, name: name.trim(), nameKey: key, aisleId })
    .onConflictDoNothing({
      target: [ingredient.householdId, ingredient.nameKey],
    })
    .returning({ id: ingredient.id, aisleId: ingredient.aisleId });
  if (created) return created;
  const [raced] = await tx
    .select({ id: ingredient.id, aisleId: ingredient.aisleId })
    .from(ingredient)
    .where(
      and(eq(ingredient.householdId, householdId), eq(ingredient.nameKey, key)),
    )
    .limit(1);
  if (!raced)
    throw new Error("ensureIngredient: insert raced and lookup failed");
  return raced;
}

/**
 * Insert or replace a recipe and its lines. Lines are linked to household ingredients by vocabulary key.
 * Returns the recipe id. Runs inside the caller's transaction.
 */
export async function saveRecipe(
  tx: Tx,
  ctx: SaveCtx,
  input: RecipeInput,
  existingRecipeId?: string,
): Promise<string> {
  const servings = input.kind === "bundle" ? 1 : input.servings;
  const values = {
    householdId: ctx.householdId,
    kind: input.kind,
    title: input.title,
    description: input.description ?? null,
    servings: String(servings),
    prepMinStated: input.prepMinStated ?? null,
    cookMinStated: input.cookMinStated ?? null,
    mealTypes: input.mealTypes,
    cuisine: input.cuisine ?? null,
    mainProtein: input.mainProtein ?? null,
    tags: input.tags,
    steps: input.kind === "bundle" ? [] : input.steps,
    imageUrl: input.imageUrl ?? null,
    sourceUrl: input.sourceUrl ?? null,
    sourceName: input.sourceName ?? null,
    captureMethod: input.captureMethod ?? null,
    importId: input.importId ?? null,
    updatedAt: new Date(),
  };
  let recipeId = existingRecipeId;
  if (recipeId) {
    const [updated] = await tx
      .update(recipe)
      .set(values)
      .where(
        and(eq(recipe.id, recipeId), eq(recipe.householdId, ctx.householdId)),
      )
      .returning({ id: recipe.id });
    if (!updated) throw new Error("Recipe not found");
    await tx
      .delete(recipeIngredient)
      .where(eq(recipeIngredient.recipeId, recipeId));
  } else {
    const [created] = await tx
      .insert(recipe)
      .values({ ...values, createdByPersonId: ctx.personId })
      .returning({ id: recipe.id });
    if (!created) throw new Error("Recipe insert failed");
    recipeId = created.id;
  }
  if (input.lines.length) {
    const rows = [];
    let position = 0;
    for (const line of input.lines) {
      const ing = await ensureIngredient(
        tx,
        ctx.householdId,
        line.nameNormalised,
      );
      rows.push({
        recipeId,
        groupName: line.groupName ?? null,
        position: position++,
        rawText: line.rawText,
        quantity: line.quantity === null ? null : String(line.quantity),
        quantityMax:
          line.quantityMax === null || line.quantityMax === undefined
            ? null
            : String(line.quantityMax),
        unit: line.unit,
        nameNormalised: line.nameNormalised,
        preparation: line.preparation ?? null,
        isOptional: line.isOptional,
        ingredientId: ing.id,
        lineHash: lineKey(line.rawText),
      });
    }
    await tx.insert(recipeIngredient).values(rows);
  }
  return recipeId;
}

/** Archive (soft delete). Plan components keep pointing at the recipe. */
export async function archiveRecipes(
  tx: Tx,
  householdId: string,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  await tx
    .update(recipe)
    .set({ archivedAt: new Date() })
    .where(and(eq(recipe.householdId, householdId), inArray(recipe.id, ids)));
}
