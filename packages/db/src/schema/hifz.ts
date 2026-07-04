import { sql } from 'drizzle-orm';
import { date, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { classes } from './classes';
import { organizations } from './organizations';
import { students } from './students';
import { users } from './users';

export const hifzRecords = pgTable('hifz_records', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  classId: uuid('class_id').references(() => classes.id),
  stream: text('stream', { enum: ['sabak', 'sabqi', 'manzil'] }).notNull(),
  surahNumber: integer('surah_number').notNull(),
  ayahStart: integer('ayah_start').notNull(),
  ayahEnd: integer('ayah_end').notNull(),
  sessionDate: date('session_date').notNull(),
  accuracyScore: integer('accuracy_score'),
  status: text('status', { enum: ['passed', 'needs_review', 'weak', 'mastered'] }).default('passed').notNull(),
  mistakeType: text('mistake_type', { enum: ['hesitation', 'tajweed', 'forgot_ayah', 'repeated_correction'] }),
  audioUrl: text('audio_url'),
  teacherNotes: text('teacher_notes'),
  recordedBy: uuid('recorded_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type HifzRecord = typeof hifzRecords.$inferSelect;
export type NewHifzRecord = typeof hifzRecords.$inferInsert;
