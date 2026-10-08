import {
  boolean,
  customType,
  decimal,
  integer,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { baseColumns } from './base.columns';
import { categories } from './categories.schema';
import { users } from './users.schema';

export const recipeStatusEnum = pgEnum('recipe_status', [
  'Draft',
  'Published',
  'Archived',
]);
export const recipeDifficultyEnum = pgEnum('recipe_difficulty', [
  'Easy',
  'Medium',
  'Hard',
]);

const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
});

export const recipes = pgTable('recipes', {
  ...baseColumns,
  title: varchar('title', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 220 }).notNull().unique(),
  description: text('description').notNull(),
  instructions: text('instructions').notNull(),
  prepTime: integer('prep_time').notNull(),
  cookTime: integer('cook_time').notNull(),
  servings: integer('servings').notNull(),
  difficulty: recipeDifficultyEnum('difficulty').notNull().default('Easy'),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  status: recipeStatusEnum('status').notNull().default('Draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  nutritionCalories: decimal('nutrition_calories', { precision: 8, scale: 2 }),
  nutritionProtein: decimal('nutrition_protein', { precision: 8, scale: 2 }),
  nutritionCarbohydrates: decimal('nutrition_carbohydrates', {
    precision: 8,
    scale: 2,
  }),
  nutritionFat: decimal('nutrition_fat', { precision: 8, scale: 2 }),
  nutritionFiber: decimal('nutrition_fiber', { precision: 8, scale: 2 }),
  nutritionSodium: decimal('nutrition_sodium', { precision: 8, scale: 2 }),
  searchVector: tsvector('search_vector'),
}, (table) => [
  index('recipes_search_vector_gin_idx')
    .using('gin', table.searchVector)
    .where(sql`${table.status} = 'Published' AND ${table.isDeleted} = false`),
]);

export const recipeSteps = pgTable(
  'recipe_steps',
  {
    ...baseColumns,
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    stepNumber: integer('step_number').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    timerMinutes: integer('timer_minutes'),
    imageUrl: varchar('image_url', { length: 500 }),
  },
  (table) => [
    unique('recipe_steps_recipe_id_step_number_unique').on(
      table.recipeId,
      table.stepNumber,
    ),
  ],
);

export const recipeIngredients = pgTable('recipe_ingredients', {
  ...baseColumns,
  recipeId: uuid('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 3 }),
  unit: varchar('unit', { length: 50 }),
  notes: varchar('notes', { length: 500 }),
  orderIndex: integer('order_index').notNull().default(0),
});

export const recipeImages = pgTable(
  'recipe_images',
  {
    ...baseColumns,
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    originalUrl: varchar('original_url', { length: 500 }).notNull(),
    objectKey: varchar('object_key', { length: 500 }).notNull(),
    mediumUrl: varchar('medium_url', { length: 500 }),
    thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
    altText: varchar('alt_text', { length: 200 }),
    isPrimary: boolean('is_primary').notNull().default(false),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (table) => [
    index('recipe_images_recipe_id_idx').on(table.recipeId),
    // The database is the final guard against two concurrent primary updates.
    uniqueIndex('recipe_images_one_primary_per_recipe_idx')
      .on(table.recipeId)
      .where(sql`${table.isPrimary} = true`),
  ],
);

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
