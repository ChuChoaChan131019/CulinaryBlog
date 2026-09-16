import { integer, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { baseColumns } from './base.columns';

export const categories = pgTable('categories', {
  ...baseColumns,
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  orderIndex: integer('order_index').notNull().default(0),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
