import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { baseColumns } from './base.columns';

export const categories = pgTable(
  'categories',
  {
    ...baseColumns,
    name: varchar('name', { length: 100 }).notNull(),
    // Slug giữ unique toàn bảng kể cả bản ghi đã xoá mềm để URL cũ không trỏ sang danh mục khác.
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    description: text('description'),
    imageUrl: varchar('image_url', { length: 500 }),
    orderIndex: integer('order_index').notNull().default(0),
    status: boolean('status').notNull().default(true),
  },
  (table) => [
    // Tên chỉ cần duy nhất trong các danh mục chưa xoá mềm, cho phép tạo lại tên đã xoá.
    uniqueIndex('categories_name_active_unique')
      .on(table.name)
      .where(sql`${table.isDeleted} = false`),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
