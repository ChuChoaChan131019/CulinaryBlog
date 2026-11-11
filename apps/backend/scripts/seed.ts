import { and, inArray, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  categories,
  recipeIngredients,
  recipeImages,
  recipes,
  recipeSteps,
  users,
} from '../src/infrastructure/database/schema';
import { seedRecipeImages } from './seed-recipe-images';
import { SAMPLE_RECIPES } from './recipe-sample-catalog';
import { SAMPLE_RECIPE_DETAILS } from './recipe-sample-details';
import { SAMPLE_RECIPE_GUIDANCE } from './recipe-sample-guidance';

const AUTHOR_EMAIL = 'lab2.seed.author@example.invalid';
const AUTHOR_DISPLAY_NAME = 'Sample Author';
const CATEGORY_NAMES = [
  'Món Việt', 'Món Á', 'Món Âu', 'Món chay', 'Món nướng',
  'Món hấp', 'Món xào', 'Món chiên', 'Món kho', 'Món canh',
  'Món súp', 'Món cơm', 'Món mì', 'Món bún', 'Món bánh',
  'Món tráng miệng', 'Món ăn sáng', 'Món ăn nhẹ', 'Món gia đình', 'Món ngày lễ',
] as const;
function categorySlug(index: number): string {
  return `category-${String(index + 1).padStart(2, '0')}`;
}

function legacyCategorySlug(index: number): string {
  return `lab2-category-${String(index + 1).padStart(2, '0')}`;
}

function sampleSlug(index: number): string {
  return `lab2-recipe-${String(index + 1).padStart(3, '0')}`;
}

function validateCatalog(): void {
  if (SAMPLE_RECIPES.length !== 100 || SAMPLE_RECIPE_DETAILS.length !== SAMPLE_RECIPES.length ||
    Object.keys(SAMPLE_RECIPE_GUIDANCE).length !== SAMPLE_RECIPES.length ||
    new Set(Object.values(SAMPLE_RECIPE_GUIDANCE)).size !== SAMPLE_RECIPES.length) {
    throw new Error('Expected exactly 100 sample dishes, details and unique general guidance entries.');
  }
  SAMPLE_RECIPE_DETAILS.forEach((recipe, index) => {
    if (recipe.title !== SAMPLE_RECIPES[index].title) throw new Error(`Title mismatch at ${sampleSlug(index)}.`);
    const guidance = SAMPLE_RECIPE_GUIDANCE[recipe.title]?.trim();
    if (!guidance || guidance === recipe.description ||
      guidance === recipe.steps.map((step) => `${step.stepNumber}. ${step.title}: ${step.description}`).join('\n')) {
      throw new Error(`Missing or duplicated general guidance for ${recipe.title}.`);
    }
    if (!CATEGORY_NAMES.includes(recipe.category as typeof CATEGORY_NAMES[number])) {
      throw new Error(`Unknown category for ${recipe.title}: ${recipe.category}`);
    }
    if (!recipe.description.trim() || recipe.ingredients.length < 3 || recipe.steps.length < 4 ||
      recipe.servings < 1 || recipe.prepTime < 0 || recipe.cookTime < 0 ||
      recipe.prepTime + recipe.cookTime < 1 ||
      recipe.ingredients.some((item) => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) {
      throw new Error(`Incomplete recipe details for ${recipe.title}.`);
    }
  });
}

async function verify(pool: Pool): Promise<void> {
  const counts = await pool.query<{
    category_count: string;
    recipe_count: string;
    seeded_recipe_count: string;
    unique_seeded_title_count: string;
    seeded_recipe_image_count: string;
    unique_seeded_image_count: string;
    incomplete_recipe_count: string;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM categories WHERE NOT is_deleted) AS category_count,
      (SELECT COUNT(*) FROM recipes WHERE NOT is_deleted) AS recipe_count,
      (SELECT COUNT(*) FROM recipes WHERE NOT is_deleted AND LEFT(slug, 12) = 'lab2-recipe-') AS seeded_recipe_count,
      (SELECT COUNT(DISTINCT title) FROM recipes WHERE NOT is_deleted AND LEFT(slug, 12) = 'lab2-recipe-') AS unique_seeded_title_count,
      (SELECT COUNT(DISTINCT r.id) FROM recipes r
        INNER JOIN recipe_images ri ON ri.recipe_id = r.id AND NOT ri.is_deleted AND ri.is_primary
        WHERE NOT r.is_deleted AND LEFT(r.slug, 12) = 'lab2-recipe-'
      ) AS seeded_recipe_image_count,
      (SELECT COUNT(DISTINCT ri.object_key) FROM recipes r
        INNER JOIN recipe_images ri ON ri.recipe_id = r.id AND NOT ri.is_deleted AND ri.is_primary
        WHERE NOT r.is_deleted AND LEFT(r.slug, 12) = 'lab2-recipe-'
      ) AS unique_seeded_image_count,
      (SELECT COUNT(*) FROM recipes r
        LEFT JOIN (SELECT recipe_id, COUNT(*) AS n FROM recipe_ingredients WHERE NOT is_deleted GROUP BY recipe_id) i ON i.recipe_id = r.id
        LEFT JOIN (SELECT recipe_id, COUNT(*) AS n FROM recipe_steps WHERE NOT is_deleted GROUP BY recipe_id) s ON s.recipe_id = r.id
        WHERE NOT r.is_deleted AND LEFT(r.slug, 12) = 'lab2-recipe-' AND
          (COALESCE(i.n, 0) < 3 OR COALESCE(s.n, 0) < 4 OR
           TRIM(r.description) = '' OR TRIM(r.instructions) = '' OR
           r.prep_time < 0 OR r.cook_time < 0 OR r.servings < 1)
      ) AS incomplete_recipe_count
  `);
  const result = counts.rows[0];
  console.log(`Categories: ${result.category_count}; recipes: ${result.recipe_count}; lab 2 recipes: ${result.seeded_recipe_count}; unique sample titles: ${result.unique_seeded_title_count}; recipes with a primary sample image: ${result.seeded_recipe_image_count}; unique sample images: ${result.unique_seeded_image_count}; incomplete sample recipes: ${result.incomplete_recipe_count}`);
  if (
    Number(result.category_count) < 20 ||
    Number(result.recipe_count) < 100 ||
    Number(result.seeded_recipe_count) !== SAMPLE_RECIPES.length ||
    Number(result.unique_seeded_title_count) !== SAMPLE_RECIPES.length ||
    Number(result.seeded_recipe_image_count) !== SAMPLE_RECIPES.length ||
    Number(result.unique_seeded_image_count) !== SAMPLE_RECIPES.length ||
    Number(result.incomplete_recipe_count) > 0
  ) {
    throw new Error('Database does not meet the lab 2 data requirements.');
  }

  const db = drizzle(pool);
  const slugs = SAMPLE_RECIPES.map((_, index) => sampleSlug(index));
  const recipeRows = await db.select({
    id: recipes.id, slug: recipes.slug, title: recipes.title,
    description: recipes.description, instructions: recipes.instructions,
    prepTime: recipes.prepTime, cookTime: recipes.cookTime,
    servings: recipes.servings, difficulty: recipes.difficulty,
    category: categories.name, authorEmail: users.email,
  }).from(recipes)
    .innerJoin(categories, eq(recipes.categoryId, categories.id))
    .innerJoin(users, eq(recipes.authorId, users.id))
    .where(inArray(recipes.slug, slugs));
  const recipeIds = recipeRows.map(({ id }) => id);
  const [ingredientRows, stepRows, imageRows] = await Promise.all([
    db.select().from(recipeIngredients).where(and(inArray(recipeIngredients.recipeId, recipeIds), eq(recipeIngredients.isDeleted, false))),
    db.select().from(recipeSteps).where(and(inArray(recipeSteps.recipeId, recipeIds), eq(recipeSteps.isDeleted, false))),
    db.select().from(recipeImages).where(and(inArray(recipeImages.recipeId, recipeIds), eq(recipeImages.isDeleted, false), eq(recipeImages.isPrimary, true))),
  ]);
  const bySlug = new Map(recipeRows.map((recipe) => [recipe.slug, recipe]));
  for (let index = 0; index < SAMPLE_RECIPE_DETAILS.length; index++) {
    const expected = SAMPLE_RECIPE_DETAILS[index];
    const actual = bySlug.get(sampleSlug(index));
    if (!actual) throw new Error(`Missing sample recipe ${sampleSlug(index)}.`);
    const expectedInstructions = SAMPLE_RECIPE_GUIDANCE[expected.title];
    if (actual.authorEmail !== AUTHOR_EMAIL || actual.title !== expected.title ||
      actual.description !== expected.description || actual.instructions !== expectedInstructions ||
      actual.prepTime !== expected.prepTime || actual.cookTime !== expected.cookTime ||
      actual.servings !== expected.servings || actual.difficulty !== expected.difficulty ||
      actual.category !== expected.category) {
      throw new Error(`Sample recipe fields differ from catalog: ${actual.slug} (${expected.title}).`);
    }
    const ingredients = ingredientRows.filter((item) => item.recipeId === actual.id).sort((a, b) => a.orderIndex - b.orderIndex);
    if (ingredients.length !== expected.ingredients.length || ingredients.some((item, position) => {
      const source = expected.ingredients[position];
      return item.name !== source.name || Number(item.quantity) !== Number(source.quantity) ||
        item.unit !== source.unit || item.orderIndex !== source.orderIndex;
    })) throw new Error(`Sample ingredients differ from catalog: ${actual.slug}.`);
    const steps = stepRows.filter((step) => step.recipeId === actual.id).sort((a, b) => a.stepNumber - b.stepNumber);
    if (steps.length !== expected.steps.length || steps.some((step, position) => {
      const source = expected.steps[position];
      return step.stepNumber !== source.stepNumber || step.title !== source.title ||
        step.description !== source.description || step.timerMinutes !== source.timerMinutes;
    })) throw new Error(`Sample steps differ from catalog: ${actual.slug}.`);
    const images = imageRows.filter((image) => image.recipeId === actual.id);
    if (images.length !== 1 || images[0].objectKey !== `recipes/${actual.id}/seed-cover.webp` ||
      images[0].altText !== expected.title) {
      throw new Error(`Sample image missing or mismatched: ${actual.slug}.`);
    }
  }
  console.log(`Verified exact fields, ingredients, steps and primary image for ${SAMPLE_RECIPE_DETAILS.length} sample recipes.`);
}

async function main(): Promise<void> {
  validateCatalog();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required.');

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);
  try {
    if (process.argv.includes('--verify-only')) {
      await verify(pool);
      return;
    }

    const slugs = SAMPLE_RECIPES.map((_, index) => sampleSlug(index));
    const result = await db.transaction(async (tx) => {
      await tx.insert(users).values({
        email: AUTHOR_EMAIL,
        username: 'culinary_seed_author',
        displayName: AUTHOR_DISPLAY_NAME,
        role: 'Author',
      }).onConflictDoNothing({ target: users.email });
      await tx.update(users)
        .set({ displayName: AUTHOR_DISPLAY_NAME })
        .where(eq(users.email, AUTHOR_EMAIL));
      const [author] = await tx.select({ id: users.id }).from(users).where(eq(users.email, AUTHOR_EMAIL));
      if (!author) throw new Error('Could not find seed author.');

      const categorySeed = CATEGORY_NAMES.map((name, index) => ({
        name,
        slug: categorySlug(index),
        description: `Danh mục ${name.toLowerCase()}.`,
        orderIndex: index,
      }));
      await tx.insert(categories).values(categorySeed).onConflictDoNothing();
      for (const category of categorySeed) {
        await tx.update(categories)
          .set({
            name: category.name,
            description: category.description,
            orderIndex: category.orderIndex,
          })
          .where(eq(categories.slug, category.slug));
      }
      const categoryRows = await tx.select({ id: categories.id, slug: categories.slug })
        .from(categories)
        .where(inArray(categories.slug, CATEGORY_NAMES.map((_, index) => categorySlug(index))));
      if (categoryRows.length !== CATEGORY_NAMES.length) {
        throw new Error('Could not find all seed categories.');
      }
      const categoryIds = new Map(categoryRows.map(({ slug, id }) => [slug, id]));
      const existing = await tx.select({ id: recipes.id, slug: recipes.slug, authorId: recipes.authorId })
        .from(recipes)
        .where(inArray(recipes.slug, slugs));
      const existingRecipes = new Map(existing.map((recipe) => [recipe.slug, recipe]));
      let inserted = 0;
      let updated = 0;

      for (let index = 0; index < SAMPLE_RECIPES.length; index++) {
        const data = SAMPLE_RECIPE_DETAILS[index];
        const slug = sampleSlug(index);
        const categoryId = categoryIds.get(categorySlug(CATEGORY_NAMES.indexOf(data.category as typeof CATEGORY_NAMES[number])));
        if (!categoryId) throw new Error(`Missing category for ${slug}.`);
        const existingRecipe = existingRecipes.get(slug);
        const instructions = SAMPLE_RECIPE_GUIDANCE[data.title];
        if (existingRecipe) {
          if (existingRecipe.authorId !== author.id) throw new Error(`Slug ${slug} belongs to a non-seed author.`);
          await tx.update(recipes)
            .set({
              title: data.title,
              description: data.description,
              instructions,
              prepTime: data.prepTime,
              cookTime: data.cookTime,
              servings: data.servings,
              difficulty: data.difficulty,
              categoryId,
              updatedAt: new Date(),
            })
            .where(eq(recipes.id, existingRecipe.id));
          await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, existingRecipe.id));
          await tx.delete(recipeSteps).where(eq(recipeSteps.recipeId, existingRecipe.id));
          await tx.insert(recipeIngredients).values(data.ingredients.map((item) => ({ ...item, recipeId: existingRecipe.id })));
          await tx.insert(recipeSteps).values(data.steps.map((step) => ({ ...step, recipeId: existingRecipe.id })));
          updated++;
          continue;
        }
        const [recipe] = await tx.insert(recipes).values({
          title: data.title,
          slug,
          description: data.description,
          instructions,
          prepTime: data.prepTime,
          cookTime: data.cookTime,
          servings: data.servings,
          difficulty: data.difficulty,
          categoryId,
          authorId: author.id,
          status: 'Published',
          publishedAt: new Date(),
        }).returning({ id: recipes.id });
        await tx.insert(recipeIngredients).values(data.ingredients.map((ingredient) => ({
          ...ingredient,
          recipeId: recipe.id,
        })));
        await tx.insert(recipeSteps).values(data.steps.map((step) => ({
          ...step,
          recipeId: recipe.id,
        })));
        inserted++;
      }
      await tx.update(categories)
        .set({ isDeleted: true })
        .where(inArray(
          categories.slug,
          CATEGORY_NAMES.map((_, index) => legacyCategorySlug(index)),
        ));
      return { inserted, updated };
    });
    console.log(`Inserted ${result.inserted} recipes; updated ${result.updated} existing seed recipes.`);
    await seedRecipeImages(pool);
    await verify(pool);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
