import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const contactSubmissions = pgTable('contact_submissions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  schoolName: text('school_name').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  schoolType: text('school_type').notNull(),
  studentCount: text('student_count').notNull(),
  message: text('message'),
  emailSent: boolean('email_sent').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
