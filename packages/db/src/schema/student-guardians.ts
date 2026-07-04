import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { students } from './students';
import { users } from './users';

export const studentGuardians = pgTable('student_guardians', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  guardianUserId: uuid('guardian_user_id')
    .notNull()
    .references(() => users.id),
  relationship: text('relationship'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  canPickup: boolean('can_pickup').default(true).notNull(),
  receivesNotifications: boolean('receives_notifications').default(true).notNull(),
  paysTuition: boolean('pays_tuition').default(false).notNull(),
}, t => [
  uniqueIndex('student_guardian_unique').on(t.studentId, t.guardianUserId),
]);

export type StudentGuardian = typeof studentGuardians.$inferSelect;
export type NewStudentGuardian = typeof studentGuardians.$inferInsert;
