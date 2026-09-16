import { pgEnum, pgTable, uuid } from 'drizzle-orm/pg-core';
import { baseColumns } from './base.columns';
import { categories } from './categories.schema';

export const recipeStatusEnum = pgEnum('recipe_status', ['Draft', 'Published', 'Archived']);

/**
 * Schema tối thiểu dùng chung cho các truy vấn category. Issue FR-RCP sẽ bổ sung
 * các trường chi tiết của công thức vào bảng này.
 */
export const recipes = pgTable('recipes', {
  ...baseColumns,
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  status: recipeStatusEnum('status').notNull().default('Draft'),
});
