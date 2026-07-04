import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeacherHomeworkOverview, createHomework, archiveHomework } from '../../actions';
import { EmptyState } from '@/components/ui/empty-state';
import { SubmitButton } from '@/components/ui/submit-button';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { ToastOnParam } from '@/components/ui/toast-on-param';

type Props = { searchParams: Promise<{ notice?: string }> };

function shortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function TeacherHomeworkPage({ searchParams }: Props) {
  const { notice } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const classes = await getTeacherHomeworkOverview(user.id);

  return (
    <>
      <ToastOnParam notice={notice} />
      <h1 className="text-h1" style={{ marginBottom: 4 }}>Homework</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Assign one task with one due date. Parents are notified the moment you post it.
      </p>

      {classes.length === 0 ? (
        <EmptyState
          icon="principal"
          title="No classes assigned yet"
          body="Once your principal assigns you to a class, you'll be able to assign homework here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {classes.map(cls => {
            const createAction = async (formData: FormData) => {
              'use server';
              const title = (formData.get('title') as string)?.trim();
              const description = (formData.get('description') as string)?.trim();
              const dueDate = formData.get('dueDate') as string;
              if (!title || !dueDate) return;
              const supabase2 = await createSupabaseServerClient();
              const { data: { user: caller } } = await supabase2.auth.getUser();
              if (!caller) redirect('/sign-in');
              await createHomework(cls.id, cls.organizationId, caller.id, {
                title,
                description: description || undefined,
                dueDate,
              });
            };

            return (
              <div key={cls.id}>
                <h2 className="text-h2" style={{ marginBottom: 12 }}>{cls.name}</h2>

                <form action={createAction} style={{ marginBottom: 16 }}>
                  <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 5 }}>
                        Task
                      </label>
                      <input
                        type="text"
                        name="title"
                        required
                        placeholder="e.g. Review Al-Baqarah 1–10"
                        className="sign-in-input"
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 5 }}>
                        Instructions (optional)
                      </label>
                      <textarea
                        name="description"
                        className="note-textarea"
                        rows={2}
                        placeholder="Any detail parents or students need"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 5 }}>
                        Due date
                      </label>
                      <input
                        type="date"
                        name="dueDate"
                        required
                        className="sign-in-input"
                        style={{ marginBottom: 0, maxWidth: 200 }}
                      />
                    </div>
                    <SubmitButton className="btn btn-accent" style={{ alignSelf: 'flex-start' }} pendingLabel="Assigning…">
                      Assign homework
                    </SubmitButton>
                  </div>
                </form>

                {cls.homework.length === 0 ? (
                  <EmptyState
                    icon="book"
                    title="No homework assigned yet"
                    body="Add a task above — it'll show up here and in every parent's feed."
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cls.homework.map(hw => {
                      const archiveAction = async () => {
                        'use server';
                        await archiveHomework(hw.id);
                      };
                      return (
                        <div key={hw.id} className="app-card" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{hw.title}</div>
                            {hw.description && (
                              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{hw.description}</div>
                            )}
                            <div style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>Due {shortDate(hw.dueDate)}</div>
                          </div>
                          <form action={archiveAction}>
                            <ConfirmSubmit
                              label="Archive"
                              title="Archive this homework?"
                              body="It will no longer show in parents' feeds."
                              confirmLabel="Archive homework"
                              variant="danger"
                              className="btn btn-ghost"
                              buttonStyle={{ fontSize: 12, padding: '4px 10px', color: 'var(--muted)' }}
                            />
                          </form>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
