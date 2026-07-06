import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').unique(),
  phone: text('phone'),
  fullName: text('full_name').notNull(),
  avatarUrl: text('avatar_url'),
  preferredLanguage: text('preferred_language').default('en').notNull(),
  quietHours: jsonb('quiet_hours'),
  // Teacher-only settings (see /account "Notification preferences" and
  // "Class preferences" sections). Both are optional JSON blobs — missing
  // keys fall back to sensible defaults in code, so no migration is needed
  // when a new preference is added later.
  notificationPrefs: jsonb('notification_prefs'),
  classPrefs: jsonb('class_prefs'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
