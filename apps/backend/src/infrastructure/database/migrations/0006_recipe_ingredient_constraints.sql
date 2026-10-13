ALTER TABLE "recipe_ingredients"
  ALTER COLUMN "name" TYPE varchar(100),
  ALTER COLUMN "quantity" SET NOT NULL,
  ALTER COLUMN "unit" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_name_not_blank_check"
    CHECK (char_length(btrim("name")) BETWEEN 1 AND 100),
  ADD CONSTRAINT "recipe_ingredients_quantity_positive_check"
    CHECK ("quantity" > 0),
  ADD CONSTRAINT "recipe_ingredients_unit_not_blank_check"
    CHECK (char_length(btrim("unit")) BETWEEN 1 AND 50);
