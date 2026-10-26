CREATE TABLE "day_context" (
	"person_id" uuid NOT NULL,
	"day" date NOT NULL,
	"is_gym" boolean DEFAULT false NOT NULL,
	"gym_kcal_override" smallint,
	"away" boolean DEFAULT false NOT NULL,
	"note" text,
	"recorded_by_user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_component" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"kind" text NOT NULL,
	"recipe_id" uuid,
	"portions" numeric(5, 2) DEFAULT '2' NOT NULL,
	"portions_manual" boolean DEFAULT false NOT NULL,
	"title" text,
	"source_component_id" uuid,
	"locked" boolean DEFAULT false NOT NULL,
	"cooked_at" timestamp with time zone,
	"created_by_person_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_component_recipe_required" CHECK ("plan_component"."kind" <> 'recipe' or "plan_component"."recipe_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "plan_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"slot_date" date NOT NULL,
	"meal_type" text NOT NULL,
	"attendee_overrides" jsonb,
	"guest_count" smallint DEFAULT 0 NOT NULL,
	"diet_rules" text[] DEFAULT '{}'::text[] NOT NULL,
	"max_minutes" smallint,
	"note" text,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aisle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"plural" text,
	"aisle_id" uuid,
	"default_unit" text,
	"density_g_per_ml" numeric(5, 3),
	"is_staple" boolean DEFAULT false NOT NULL,
	"category" text,
	"food_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_call_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd_micro" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"kind" text DEFAULT 'recipe' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"servings" numeric(5, 2) DEFAULT '2' NOT NULL,
	"prep_min_stated" smallint,
	"cook_min_stated" smallint,
	"prep_min_learned" numeric(5, 1),
	"prep_samples" smallint DEFAULT 0 NOT NULL,
	"times_cooked" integer DEFAULT 0 NOT NULL,
	"last_cooked_on" date,
	"meal_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"cuisine" text,
	"main_protein" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"diet_status" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"diet_manual" boolean DEFAULT false NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_url" text,
	"source_url" text,
	"source_name" text,
	"capture_method" text,
	"import_id" uuid,
	"nutrition_status" text DEFAULT 'missing' NOT NULL,
	"created_by_person_id" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_servings_positive" CHECK ("recipe"."servings" > 0)
);
--> statement-breakpoint
CREATE TABLE "recipe_import" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_url" text,
	"blob_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"tier_used" text,
	"raw_payload" jsonb,
	"extracted" jsonb,
	"field_confidence" jsonb,
	"warnings" text[] DEFAULT '{}'::text[] NOT NULL,
	"recipe_id" uuid,
	"error" text,
	"created_by_person_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"group_name" text,
	"position" smallint DEFAULT 0 NOT NULL,
	"raw_text" text NOT NULL,
	"quantity" numeric(10, 3),
	"quantity_max" numeric(10, 3),
	"unit" text,
	"name_normalised" text NOT NULL,
	"preparation" text,
	"is_optional" boolean DEFAULT false NOT NULL,
	"ingredient_id" uuid,
	"food_code" text,
	"grams_estimate" numeric(8, 1),
	"grams_method" text,
	"match_confidence" numeric(3, 2),
	"match_source" text,
	"confirmed_at" timestamp with time zone,
	"line_hash" text
);
--> statement-breakpoint
CREATE TABLE "shopping_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"generation_key" text NOT NULL,
	"ingredient_id" uuid,
	"display_name" text NOT NULL,
	"qty" numeric(10, 2),
	"unit" text,
	"qty_display" text NOT NULL,
	"packs_display" text,
	"aisle_id" uuid,
	"position" smallint DEFAULT 0 NOT NULL,
	"source" text NOT NULL,
	"provenance" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"manually_edited" boolean DEFAULT false NOT NULL,
	"note" text,
	"checked_at" timestamp with time zone,
	"checked_by_person_id" uuid,
	"removed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "day_context" ADD CONSTRAINT "day_context_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_component" ADD CONSTRAINT "plan_component_slot_id_plan_slot_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."plan_slot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_component" ADD CONSTRAINT "plan_component_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_component" ADD CONSTRAINT "plan_component_created_by_person_id_person_id_fk" FOREIGN KEY ("created_by_person_id") REFERENCES "public"."person"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_slot" ADD CONSTRAINT "plan_slot_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aisle" ADD CONSTRAINT "aisle_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient" ADD CONSTRAINT "ingredient_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient" ADD CONSTRAINT "ingredient_aisle_id_aisle_id_fk" FOREIGN KEY ("aisle_id") REFERENCES "public"."aisle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_call_log" ADD CONSTRAINT "llm_call_log_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_created_by_person_id_person_id_fk" FOREIGN KEY ("created_by_person_id") REFERENCES "public"."person"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_import" ADD CONSTRAINT "recipe_import_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_import" ADD CONSTRAINT "recipe_import_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_import" ADD CONSTRAINT "recipe_import_created_by_person_id_person_id_fk" FOREIGN KEY ("created_by_person_id") REFERENCES "public"."person"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_item" ADD CONSTRAINT "shopping_item_list_id_shopping_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."shopping_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_item" ADD CONSTRAINT "shopping_item_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_item" ADD CONSTRAINT "shopping_item_aisle_id_aisle_id_fk" FOREIGN KEY ("aisle_id") REFERENCES "public"."aisle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list" ADD CONSTRAINT "shopping_list_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "day_context_pk" ON "day_context" USING btree ("person_id","day");--> statement-breakpoint
CREATE INDEX "plan_component_slot_idx" ON "plan_component" USING btree ("slot_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_slot_household_date_meal_idx" ON "plan_slot" USING btree ("household_id","slot_date","meal_type");--> statement-breakpoint
CREATE UNIQUE INDEX "aisle_household_name_idx" ON "aisle" USING btree ("household_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_household_name_key_idx" ON "ingredient" USING btree ("household_id","name_key");--> statement-breakpoint
CREATE INDEX "ingredient_name_key_trgm_idx" ON "ingredient" USING gin ("name_key" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "llm_call_log_household_created_idx" ON "llm_call_log" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "recipe_household_kind_idx" ON "recipe" USING btree ("household_id","kind");--> statement-breakpoint
CREATE INDEX "recipe_title_trgm_idx" ON "recipe" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "recipe_import_household_created_idx" ON "recipe_import" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "recipe_ingredient_recipe_idx" ON "recipe_ingredient" USING btree ("recipe_id","position");--> statement-breakpoint
CREATE INDEX "recipe_ingredient_ingredient_idx" ON "recipe_ingredient" USING btree ("ingredient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_item_list_key_idx" ON "shopping_item" USING btree ("list_id","generation_key");--> statement-breakpoint
CREATE INDEX "shopping_item_list_aisle_idx" ON "shopping_item" USING btree ("list_id","aisle_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_list_household_week_idx" ON "shopping_list" USING btree ("household_id","week_start");