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

  // Hifz milestones
  milestone_recorded: { type: 'success', message: 'Milestone recorded. Parents have been notified.' },
};
