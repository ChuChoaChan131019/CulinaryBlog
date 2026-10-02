CREATE TABLE "recipe_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"recipe_id" uuid NOT NULL,
	"original_url" varchar(500) NOT NULL,
	"object_key" varchar(500) NOT NULL,
	"medium_url" varchar(500),
	"thumbnail_url" varchar(500),
	"alt_text" varchar(200),
	"is_primary" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "recipe_images_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "recipe_images_recipe_id_idx" ON "recipe_images" USING btree ("recipe_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_images_one_primary_per_recipe_idx" ON "recipe_images" USING btree ("recipe_id") WHERE "recipe_images"."is_primary" = true;
