import { sql } from 'drizzle-orm';
import { date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { students } from './students';
import { users } from './users';

export const hifzMilestones = pgTable('hifz_milestones', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  type: text('type', {
    enum: ['surah_completed', 'juz_completed', 'revision_completed'],
  }).notNull(),
  label: text('label').notNull(),
  achievedDate: date('achieved_date').notNull(),
  teacherNotes: text('teacher_notes'),
  recordedBy: uuid('recorded_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type HifzMilestone = typeof hifzMilestones.$inferSelect;
export type NewHifzMilestone = typeof hifzMilestones.$inferInsert;
