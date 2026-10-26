import { z } from "zod";
import { CAPTURE_METHODS, MEAL_TYPES, RECIPE_KINDS } from "@/db/schema";

export const recipeLineInput = z.object({
  rawText: z.string().trim().min(1).max(300),
  quantity: z.number().nonnegative().nullable(),
  quantityMax: z.number().nonnegative().nullable().optional(),
  unit: z.string().max(20).nullable(),
  nameNormalised: z.string().trim().min(1).max(120),
  preparation: z.string().max(200).nullable().optional(),
  isOptional: z.boolean().default(false),
  groupName: z.string().max(80).nullable().optional(),
});

export const recipeInput = z.object({
  kind: z.enum(RECIPE_KINDS).default("recipe"),
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  servings: z.number().positive().max(100).default(2),
  prepMinStated: z.number().int().min(0).max(1440).nullable().optional(),
  cookMinStated: z.number().int().min(0).max(1440).nullable().optional(),
  mealTypes: z.array(z.enum(MEAL_TYPES)).min(1),
  cuisine: z.string().max(60).nullable().optional(),
  mainProtein: z.string().max(60).nullable().optional(),
  tags: z.array(z.string().max(40)).default([]),
  steps: z
    .array(
      z.object({
        text: z.string().min(1).max(4000),
        minutesHint: z.number().int().positive().optional(),
      }),
    )
    .default([]),
  imageUrl: z.url().nullable().optional(),
  sourceUrl: z.url().nullable().optional(),
  sourceName: z.string().max(120).nullable().optional(),
  captureMethod: z.enum(CAPTURE_METHODS).nullable().optional(),
  importId: z.uuid().nullable().optional(),
  lines: z.array(recipeLineInput).default([]),
});

export type RecipeInput = z.infer<typeof recipeInput>;
export type RecipeLineInput = z.infer<typeof recipeLineInput>;
