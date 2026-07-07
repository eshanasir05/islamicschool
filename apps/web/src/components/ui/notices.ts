/**
 * Known toast notices, keyed by a stable slug passed through the URL as
 * `?notice=<key>`. Messages are looked up client-side from this dictionary,
 * so no arbitrary text is ever reflected from the URL into a toast.
 */
export type NoticeType = 'success' | 'error' | 'info';

export const NOTICES: Record<string, { type: NoticeType; message: string }> = {
  // Students
  student_created: { type: 'success', message: 'Student added.' },
  student_updated: { type: 'success', message: 'Student details saved.' },
  student_archived: { type: 'success', message: 'Student archived.' },
  student_restored: { type: 'success', message: 'Student restored.' },

  // Classes
  class_created: { type: 'success', message: 'Class created.' },
  class_updated: { type: 'success', message: 'Class saved.' },
  class_archived: { type: 'success', message: 'Class archived.' },
  class_restored: { type: 'success', message: 'Class restored.' },
  student_enrolled: { type: 'success', message: 'Student added to class.' },
  student_unenrolled: { type: 'success', message: 'Student removed from class.' },

  // Guardians
  guardian_linked: { type: 'success', message: 'Guardian linked. Ask them to use “Forgot password” to set a password.' },
  guardian_unlinked: { type: 'success', message: 'Guardian unlinked.' },
  guardian_error: { type: 'error', message: 'Could not link guardian. Check the email and try again.' },

  // Teachers / parents
  teacher_invited: { type: 'success', message: 'Invitation sent to the teacher.' },
  parent_invited: { type: 'success', message: 'Parent invited and linked.' },

  // Tuition
  plan_created: { type: 'success', message: 'Tuition plan created.' },
  plan_cancelled: { type: 'success', message: 'Tuition plan cancelled.' },
  reminders_sent: { type: 'success', message: 'Reminder(s) sent to past-due families.' },
  no_reminders_due: { type: 'info', message: 'No past-due reminders were due to send.' },

  // Announcements
  announcement_posted: { type: 'success', message: 'Announcement posted.' },
  announcement_deleted: { type: 'success', message: 'Announcement removed.' },

  // Settings / account
  settings_saved: { type: 'success', message: 'Settings saved.' },
  profile_saved: { type: 'success', message: 'Profile updated.' },
  password_changed: { type: 'success', message: 'Password updated.' },

  // Homework
  homework_assigned: { type: 'success', message: 'Homework assigned. Parents have been notified.' },
  homework_archived: { type: 'success', message: 'Homework archived.' },
  homework_restored: { type: 'success', message: 'Homework restored.' },

  // Notes
  note_deleted: { type: 'success', message: 'Note deleted. You can restore it from Recently deleted.' },
  note_restored: { type: 'success', message: 'Note restored.' },

  // Hifz milestones
  milestone_recorded: { type: 'success', message: 'Milestone recorded. Parents have been notified.' },

  // Attendance follow-up
  absence_reason_submitted: { type: 'success', message: 'Thanks — the school has been notified.' },

  // Parent-teacher notes
  note_sent_to_teacher: { type: 'success', message: 'Note sent to the teacher.' },

  // Billing
  billing_no_customer: { type: 'info', message: 'No billing history yet for this plan — nothing to manage until your first payment.' },

  // Teacher session flow
  session_erased: { type: 'success', message: 'Class session erased. You can start it over from scratch.' },

  // Trial placements
  trial_created: { type: 'success', message: 'Trial scheduled.' },
  trial_cancelled: { type: 'success', message: 'Trial cancelled.' },
  trial_converted: { type: 'success', message: 'Trial converted to an enrolled student.' },
  trial_convert_error: { type: 'error', message: 'Could not convert this trial. Please try again.' },
  assessment_submitted: { type: 'success', message: 'Assessment submitted. The admin can now convert this trial.' },
};
