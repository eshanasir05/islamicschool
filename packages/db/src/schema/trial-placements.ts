import { sql } from 'drizzle-orm';
import { date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { classes } from './classes';
import { contactSubmissions } from './leads';
import { organizations } from './organizations';
import { students } from './students';
import { users } from './users';

export const trialPlacements = pgTable('trial_placements', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  contactSubmissionId: uuid('contact_submission_id').references(() => contactSubmissions.id),
  studentFirstName: text('student_first_name').notNull(),
  studentLastName: text('student_last_name').notNull(),
  guardianName: text('guardian_name').notNull(),
  guardianEmail: text('guardian_email').notNull(),
  guardianPhone: text('guardian_phone'),
  scheduledDate: date('scheduled_date'),
  assignedTeacherId: uuid('assigned_teacher_id').references(() => users.id),
  status: text('status', { enum: ['scheduled', 'assessed', 'converted', 'cancelled'] }).default('scheduled').notNull(),

  // Placement assessment, filled by the assigned teacher
  quranReadingLevel: text('quran_reading_level'),
  hifzLevel: text('hifz_level'),
  arabicLevel: text('arabic_level'),
  behaviorReadiness: text('behavior_readiness'),
  recommendedClassId: uuid('recommended_class_id').references(() => classes.id),
  assessmentNotes: text('assessment_notes'),
  assessedAt: timestamp('assessed_at', { withTimezone: true }),

  convertedStudentId: uuid('converted_student_id').references(() => students.id),
  convertedAt: timestamp('converted_at', { withTimezone: true }),

  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TrialPlacement = typeof trialPlacements.$inferSelect;
export type NewTrialPlacement = typeof trialPlacements.$inferInsert;
