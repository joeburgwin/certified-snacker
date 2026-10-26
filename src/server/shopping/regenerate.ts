import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { Tx } from "@/db";
import {
  household,
  ingredient,
  planComponent,
  planSlot,
  recipe,
  recipeIngredient,
  shoppingItem,
  shoppingList,
} from "@/db/schema";
import { addDays, type IsoDate } from "@/domain/dates";
import {
  aggregate,
  baseUnitFor,
  type ComponentInput,
  type ExistingRow,
  reconcile,
} from "@/domain/shopping-list";

/**
 * Rebuild the plan-derived rows of a week's shopping list inside the caller's transaction.
 * Idempotent (unique list_id + generation_key); preserves ticks, aisle moves, manual rows and tombstones.
 * Returns the list id, or null when no list exists and createIfMissing is false.
 */
export async function regenerateShoppingList(
  tx: Tx,
  householdId: string,
  weekStart: IsoDate,
  options: { createIfMissing?: boolean } = {},
): Promise<string | null> {
  const [list0] = await tx
    .select({ id: shoppingList.id })
    .from(shoppingList)
    .where(
      and(
        eq(shoppingList.householdId, householdId),
        eq(shoppingList.weekStart, weekStart),
      ),
    )
    .limit(1);
  let listId = list0?.id ?? null;
  if (!listId) {
    if (!options.createIfMissing) return null;
    const [created] = await tx
      .insert(shoppingList)
      .values({ householdId, weekStart })
      .onConflictDoNothing({
        target: [shoppingList.householdId, shoppingList.weekStart],
      })
      .returning({ id: shoppingList.id });
    if (created) listId = created.id;
    else {
      const [again] = await tx
        .select({ id: shoppingList.id })
        .from(shoppingList)
        .where(
          and(
            eq(shoppingList.householdId, householdId),
            eq(shoppingList.weekStart, weekStart),
          ),
        )
        .limit(1);
      listId = again?.id ?? null;
    }
  }
  if (!listId) throw new Error("shopping list could not be created");

  const [hh] = await tx
    .select({ includeOptional: household.includeOptionalIngredients })
    .from(household)
    .where(eq(household.id, householdId))
    .limit(1);
  const weekEnd = addDays(weekStart, 6);

  const rows = await tx
    .select({
      componentId: planComponent.id,
      slotDate: planSlot.slotDate,
      mealType: planSlot.mealType,
      portions: planComponent.portions,
      recipeTitle: recipe.title,
      servings: recipe.servings,
      lineId: recipeIngredient.id,
      ingredientId: recipeIngredient.ingredientId,
      name: recipeIngredient.nameNormalised,
      quantity: recipeIngredient.quantity,
      unit: recipeIngredient.unit,
      isOptional: recipeIngredient.isOptional,
      ingName: ingredient.name,
      ingKey: ingredient.nameKey,
      aisleId: ingredient.aisleId,
    })
    .from(planComponent)
    .innerJoin(planSlot, eq(planSlot.id, planComponent.slotId))
    .innerJoin(recipe, eq(recipe.id, planComponent.recipeId))
    .leftJoin(recipeIngredient, eq(recipeIngredient.recipeId, recipe.id))
    .leftJoin(ingredient, eq(ingredient.id, recipeIngredient.ingredientId))
    .where(
      and(
        eq(planSlot.householdId, householdId),
        gte(planSlot.slotDate, weekStart),
        lte(planSlot.slotDate, weekEnd),
        eq(planComponent.kind, "recipe"),
      ),
    )
    .orderBy(
      asc(planSlot.slotDate),
      asc(planComponent.position),
      asc(recipeIngredient.position),
    );

  const byComponent = new Map<string, ComponentInput>();
  for (const r of rows) {
    let c = byComponent.get(r.componentId);
    if (!c) {
      c = {
        componentId: r.componentId,
        slotDate: r.slotDate,
        mealType: r.mealType,
        recipeTitle: r.recipeTitle,
        portions: Number(r.portions),
        servings: Number(r.servings),
        lines: [],
      };
      byComponent.set(r.componentId, c);
    }
    if (!r.lineId || r.name === null) continue;
    c.lines.push({
      ingredientId: r.ingredientId,
      name: r.ingName ?? r.name,
      nameKey: r.ingKey ?? r.name,
      quantity: r.quantity === null ? null : Number(r.quantity),
      unit: r.unit,
      isOptional: r.isOptional ?? false,
      aisleId: r.aisleId,
    });
  }

  const staples = await tx
    .select({
      ingredientId: ingredient.id,
      name: ingredient.name,
      aisleId: ingredient.aisleId,
    })
    .from(ingredient)
    .where(
      and(
        eq(ingredient.householdId, householdId),
        eq(ingredient.isStaple, true),
      ),
    );

  const required = aggregate([...byComponent.values()], {
    includeOptional: hh?.includeOptional ?? false,
    staples,
  });

  const existingRows = await tx
    .select()
    .from(shoppingItem)
    .where(eq(shoppingItem.listId, listId));
  const existing: ExistingRow[] = existingRows.map((e) => ({
    id: e.id,
    generationKey: e.generationKey,
    qty: e.qty === null ? null : Number(e.qty),
    unit: e.unit,
    source: e.source,
    checkedAt: e.checkedAt,
    removedAt: e.removedAt,
    manuallyEdited: e.manuallyEdited,
    aisleId: e.aisleId,
  }));
  const plan = reconcile(existing, required);

  if (plan.inserts.length) {
    await tx.insert(shoppingItem).values(
      plan.inserts.map((r) => ({
        listId: listId as string,
        generationKey: r.generationKey,
        ingredientId: r.ingredientId,
        displayName: r.displayName,
        qty: r.source === "plan" ? String(r.qtyBase) : null,
        unit: baseUnitFor(r.family, r.countLabel),
        qtyDisplay: r.qtyDisplay,
        aisleId: r.aisleId,
        source: r.source,
        provenance: r.provenance,
      })),
    );
  }
  for (const u of plan.updates) {
    const ex = existingRows.find((e) => e.id === u.id);
    await tx
      .update(shoppingItem)
      .set({
        displayName: ex?.manuallyEdited ? undefined : u.row.displayName,
        qty: u.row.source === "plan" ? String(u.row.qtyBase) : null,
        unit: baseUnitFor(u.row.family, u.row.countLabel),
        qtyDisplay: u.row.qtyDisplay,
        provenance: u.row.provenance,
        aisleId: ex?.aisleId ?? u.row.aisleId,
        checkedAt: u.uncheck ? null : undefined,
        note: u.uncheck ? u.note : undefined,
        updatedAt: new Date(),
      })
      .where(eq(shoppingItem.id, u.id));
  }
  if (plan.deleteIds.length) {
    for (const id of plan.deleteIds)
      await tx.delete(shoppingItem).where(eq(shoppingItem.id, id));
  }
  await tx
    .update(shoppingList)
    .set({
      generatedAt: new Date(),
      version:
        (
          await tx
            .select({ v: shoppingList.version })
            .from(shoppingList)
            .where(eq(shoppingList.id, listId))
            .limit(1)
        )[0]?.v ?? 0,
    })
    .where(eq(shoppingList.id, listId));
  return listId;
}
