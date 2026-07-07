import { sql } from 'drizzle-orm';
import { boolean, date, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { classes } from './classes';
import { organizations } from './organizations';
import { students } from './students';
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

// Marked done by a guardian, per student — homework itself is class-wide, but
// completion is tracked per child since siblings in the same class don't
// necessarily finish at the same time.
export const homeworkCompletions = pgTable('homework_completions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  homeworkAssignmentId: uuid('homework_assignment_id')
    .notNull()
    .references(() => homeworkAssignments.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  completedBy: uuid('completed_by')
    .notNull()
    .references(() => users.id),
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  uniqueIndex('homework_completion_unique').on(t.homeworkAssignmentId, t.studentId),
]);

export type HomeworkAssignment = typeof homeworkAssignments.$inferSelect;
export type NewHomeworkAssignment = typeof homeworkAssignments.$inferInsert;
export type HomeworkCompletion = typeof homeworkCompletions.$inferSelect;
export type NewHomeworkCompletion = typeof homeworkCompletions.$inferInsert;
