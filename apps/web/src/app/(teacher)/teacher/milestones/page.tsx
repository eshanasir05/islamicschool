import { EmptyState } from '@/components/ui/empty-state';
import { SubmitButton } from '@/components/ui/submit-button';
import { ToastOnParam } from '@/components/ui/toast-on-param';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createMilestone, getTeacherMilestonesOverview } from '../../actions';

type Props = { searchParams: Promise<{ notice?: string }> };

const MILESTONE_TYPE_LABEL: Record<string, string> = {
  surah_completed: 'Surah completed',
  juz_completed: 'Juz completed',
  revision_completed: 'Revision completed',
};

function shortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function TeacherMilestonesPage({ searchParams }: Props) {
  const { notice } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const classes = await getTeacherMilestonesOverview(user.id);

  return (
    <>
      <ToastOnParam notice={notice} />
      <h1 className="text-h1" style={{ marginBottom: 4 }}>
        Hifz milestones
      </h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Record surah completions, juz milestones, and revision progress. Parents are notified right
        away.
      </p>

      {classes.length === 0 ? (
        <EmptyState
          icon="principal"
          title="No classes assigned yet"
          body="Once your principal assigns you to a class, you'll be able to record hifz milestones here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {classes.map((cls) => {
            const students = cls.enrollments
              .map((e) => e.student)
              .filter((s): s is NonNullable<typeof s> => !!s);

            const createAction = async (formData: FormData) => {
              'use server';
              const studentId = formData.get('studentId') as string;
              const type = formData.get('type') as
                | 'surah_completed'
                | 'juz_completed'
                | 'revision_completed';
              const label = (formData.get('label') as string)?.trim();
              const achievedDate = formData.get('achievedDate') as string;
              const teacherNotes = (formData.get('teacherNotes') as string)?.trim();
              if (!studentId || !type || !label || !achievedDate) return;
              await createMilestone(studentId, {
                type,
                label,
                achievedDate,
                teacherNotes: teacherNotes || undefined,
              });
            };

            return (
              <div key={cls.id}>
                <h2 className="text-h2" style={{ marginBottom: 12 }}>
                  {cls.name}
                </h2>

                {students.length === 0 ? (
                  <EmptyState
                    icon="users"
                    title="No students enrolled"
                    body="Enroll students in this class first."
                  />
                ) : (
                  <>
                    <form action={createAction} style={{ marginBottom: 16 }}>
                      <div
                        className="app-card"
                        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                      >
                        <div className="field">
                          <label htmlFor={`milestoneStudent-${cls.id}`} className="text-label">
                            Student
                          </label>
                          <select
                            id={`milestoneStudent-${cls.id}`}
                            name="studentId"
                            required
                            className="form-select"
                          >
                            <option value="">— Select student —</option>
                            {students.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.fullName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-grid">
                          <div className="field">
                            <label htmlFor={`milestoneType-${cls.id}`} className="text-label">
                              Milestone type
                            </label>
                            <select
                              id={`milestoneType-${cls.id}`}
                              name="type"
                              required
                              className="form-select"
                            >
                              <option value="surah_completed">Surah completed</option>
                              <option value="juz_completed">Juz completed</option>
                              <option value="revision_completed">Revision completed</option>
                            </select>
                          </div>
                          <div className="field">
                            <label
                              htmlFor={`milestoneAchievedDate-${cls.id}`}
                              className="text-label"
                            >
                              Achieved date
                            </label>
                            <input
                              id={`milestoneAchievedDate-${cls.id}`}
                              type="date"
                              name="achievedDate"
                              required
                              className="form-input"
                            />
                          </div>
                        </div>
                        <div className="field">
                          <label htmlFor={`milestoneLabel-${cls.id}`} className="text-label">
                            Label
                          </label>
                          <input
                            id={`milestoneLabel-${cls.id}`}
                            type="text"
                            name="label"
                            required
                            placeholder="e.g. Surah Al-Baqarah, or Juz 1"
                            className="form-input"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`milestoneNotes-${cls.id}`} className="text-label">
                            Notes (optional)
                          </label>
                          <textarea
                            id={`milestoneNotes-${cls.id}`}
                            name="teacherNotes"
                            className="form-textarea"
                            rows={2}
                            placeholder="Any detail for the family"
                          />
                        </div>
                        <SubmitButton
                          className="btn btn-accent"
                          style={{ alignSelf: 'flex-start' }}
                          pendingLabel="Recording…"
                        >
                          Record milestone
                        </SubmitButton>
                      </div>
                    </form>

                    {cls.milestones.length === 0 ? (
                      <EmptyState
                        icon="star"
                        title="No milestones recorded yet"
                        body="Record a surah, juz, or revision milestone above — it'll show up here and in the parent's feed."
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cls.milestones.map((m) => (
                          <div
                            key={m.id}
                            className="app-card"
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: 12,
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="badge badge-sabak">
                                  {MILESTONE_TYPE_LABEL[m.type]}
                                </span>
                                <span style={{ fontWeight: 600, color: 'var(--fg)' }}>
                                  {m.label}
                                </span>
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
                                {m.student?.fullName ?? 'Student'} · {shortDate(m.achievedDate)}
                              </div>
                              {m.teacherNotes && (
                                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 6 }}>
                                  {m.teacherNotes}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
