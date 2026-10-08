CREATE EXTENSION IF NOT EXISTS "unaccent";--> statement-breakpoint
CREATE TEXT SEARCH CONFIGURATION culinary_search (COPY = simple);--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION culinary_search
  ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, hword, hword_part, word
  WITH unaccent, simple;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "search_vector" tsvector;--> statement-breakpoint
CREATE FUNCTION recipes_search_vector_update() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('culinary_search', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('culinary_search', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER recipes_search_vector_update_trigger
BEFORE INSERT OR UPDATE OF title, description ON recipes
FOR EACH ROW EXECUTE FUNCTION recipes_search_vector_update();--> statement-breakpoint
UPDATE recipes
SET search_vector =
  setweight(to_tsvector('culinary_search', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('culinary_search', coalesce(description, '')), 'B');--> statement-breakpoint
CREATE INDEX "recipes_search_vector_gin_idx" ON "recipes" USING gin ("search_vector") WHERE "recipes"."status" = 'Published' AND "recipes"."is_deleted" = false;
