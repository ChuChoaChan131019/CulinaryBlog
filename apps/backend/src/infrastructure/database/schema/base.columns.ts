import { boolean, integer, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Cột dùng chung cho mọi bảng (tương đương BaseEntity trong SRS chương 7):
 * id, createdAt, updatedAt, isDeleted (soft delete), rowVersion (optimistic concurrency).
 */
export const baseColumns = {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  isDeleted: boolean('is_deleted').notNull().default(false),
  rowVersion: integer('row_version').notNull().default(1),
};
