import { relations } from 'drizzle-orm';
import { attendanceRecords } from './attendance';
import { classes, classEnrollments } from './classes';
import { hifzRecords } from './hifz';
import { hifzMilestones } from './hifz-milestones';
import { homeworkAssignments } from './homework';
import { memberships } from './memberships';
import { studentNotes } from './notes';
import { organizations } from './organizations';
import { payments } from './payments';
import { studentGuardians } from './student-guardians';
import { students } from './students';
import { tuitionPlans } from './tuition';
import { users } from './users';

export const studentsRelations = relations(students, ({ many }) => ({
  attendanceRecords: many(attendanceRecords),
  hifzRecords: many(hifzRecords),
  hifzMilestones: many(hifzMilestones),
  notes: many(studentNotes),
  enrollments: many(classEnrollments),
  guardians: many(studentGuardians),
  tuitionPlans: many(tuitionPlans),
}));

export const hifzMilestonesRelations = relations(hifzMilestones, ({ one }) => ({
  student: one(students, { fields: [hifzMilestones.studentId], references: [students.id] }),
  recorder: one(users, { fields: [hifzMilestones.recordedBy], references: [users.id] }),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  student: one(students, { fields: [attendanceRecords.studentId], references: [students.id] }),
  class: one(classes, { fields: [attendanceRecords.classId], references: [classes.id] }),
}));

export const hifzRecordsRelations = relations(hifzRecords, ({ one }) => ({
  student: one(students, { fields: [hifzRecords.studentId], references: [students.id] }),
  class: one(classes, { fields: [hifzRecords.classId], references: [classes.id] }),
}));

export const studentNotesRelations = relations(studentNotes, ({ one }) => ({
  student: one(students, { fields: [studentNotes.studentId], references: [students.id] }),
  class: one(classes, { fields: [studentNotes.classId], references: [classes.id] }),
}));

export const studentGuardiansRelations = relations(studentGuardians, ({ one }) => ({
  student: one(students, { fields: [studentGuardians.studentId], references: [students.id] }),
  guardian: one(users, { fields: [studentGuardians.guardianUserId], references: [users.id] }),
}));

export const classEnrollmentsRelations = relations(classEnrollments, ({ one }) => ({
  class: one(classes, { fields: [classEnrollments.classId], references: [classes.id] }),
  student: one(students, { fields: [classEnrollments.studentId], references: [students.id] }),
}));

export const classesRelations = relations(classes, ({ many, one }) => ({
  enrollments: many(classEnrollments),
  attendanceRecords: many(attendanceRecords),
  hifzRecords: many(hifzRecords),
  notes: many(studentNotes),
  homeworkAssignments: many(homeworkAssignments),
  primaryTeacher: one(users, { fields: [classes.primaryTeacherId], references: [users.id] }),
}));

export const homeworkAssignmentsRelations = relations(homeworkAssignments, ({ one }) => ({
  class: one(classes, { fields: [homeworkAssignments.classId], references: [classes.id] }),
  creator: one(users, { fields: [homeworkAssignments.createdBy], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  guardianLinks: many(studentGuardians, { relationName: 'guardian' }),
  teachingClasses: many(classes),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  organization: one(organizations, { fields: [memberships.organizationId], references: [organizations.id] }),
}));

export const tuitionPlansRelations = relations(tuitionPlans, ({ one, many }) => ({
  student: one(students, { fields: [tuitionPlans.studentId], references: [students.id] }),
  guardian: one(users, { fields: [tuitionPlans.guardianUserId], references: [users.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  tuitionPlan: one(tuitionPlans, { fields: [payments.tuitionPlanId], references: [tuitionPlans.id] }),
  payer: one(users, { fields: [payments.payerUserId], references: [users.id] }),
}));
