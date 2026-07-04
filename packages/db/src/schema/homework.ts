import { sql } from 'drizzle-orm';
import { boolean, date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { classes } from './classes';
import { organizations } from './organizations';
import { users } from './users';

export const homeworkAssignments = pgTable('homework_assignments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  classId: uuid('class_id')
    .notNull()
    .references(() => classes.id),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('due_date').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  archived: boolean('archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type HomeworkAssignment = typeof homeworkAssignments.$inferSelect;
export type NewHomeworkAssignment = typeof homeworkAssignments.$inferInsert;
