import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { classes } from './classes';
import { organizations } from './organizations';
import { students } from './students';
import { users } from './users';

export const studentNotes = pgTable('student_notes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  classId: uuid('class_id').references(() => classes.id),
  noteType: text('note_type', {
    enum: ['praise', 'concern', 'general', 'homework'],
  }).notNull(),
  category: text('category'),
  content: text('content').notNull(),
  visibleToParent: boolean('visible_to_parent').default(true).notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type StudentNote = typeof studentNotes.$inferSelect;
export type NewStudentNote = typeof studentNotes.$inferInsert;
