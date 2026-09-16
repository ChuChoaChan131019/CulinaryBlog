CREATE TYPE "public"."recipe_difficulty" AS ENUM('Easy', 'Medium', 'Hard');--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"recipe_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"quantity" numeric(10, 3),
	"unit" varchar(50),
	"notes" varchar(500),
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"recipe_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"timer_minutes" integer,
	"image_url" varchar(500),
	CONSTRAINT "recipe_steps_recipe_id_step_number_unique" UNIQUE("recipe_id","step_number")
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "title" varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "slug" varchar(220) NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "instructions" text NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "prep_time" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "cook_time" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "servings" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "difficulty" "recipe_difficulty" DEFAULT 'Easy' NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "author_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "nutrition_calories" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "nutrition_protein" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "nutrition_carbohydrates" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "nutrition_fat" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "nutrition_fiber" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "nutrition_sodium" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_slug_unique" UNIQUE("slug");