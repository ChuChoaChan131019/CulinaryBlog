import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { baseColumns } from './base.columns';
import { users } from './users.schema';

export const passwordResetTokens = pgTable('password_reset_tokens', {
  ...baseColumns,
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
