import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeacherTrials, getTeacherClasses, submitPlacementAssessment } from '../../actions';
import { EmptyState } from '@/components/ui/empty-state';
import { SubmitButton } from '@/components/ui/submit-button';
import { ToastOnParam } from '@/components/ui/toast-on-param';

type Props = { searchParams: Promise<{ notice?: string }> };

export default async function TeacherTrialsPage({ searchParams }: Props) {
  const { notice } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [trials, classes] = await Promise.all([
    getTeacherTrials(user.id),
    getTeacherClasses(user.id),
  ]);

  return (
    <>
      <ToastOnParam notice={notice} />
      <h1 className="text-h1" style={{ marginBottom: 4 }}>Trial placements</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Assess a trial student and recommend a class. The admin will convert them to an enrolled
        student once you&apos;re done.
      </p>

      {trials.length === 0 ? (
        <EmptyState
          icon="cal"
          title="No trial placements assigned"
          body="When the admin schedules a trial and assigns it to you, it will appear here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {trials.map(trial => {
            const submitAction = async (formData: FormData) => {
              'use server';
              const quranReadingLevel = (formData.get('quranReadingLevel') as string)?.trim();
              const hifzLevel = (formData.get('hifzLevel') as string)?.trim();
              const arabicLevel = (formData.get('arabicLevel') as string)?.trim();
              const behaviorReadiness = (formData.get('behaviorReadiness') as string)?.trim();
              const recommendedClassId = formData.get('recommendedClassId') as string;
              const assessmentNotes = formData.get('assessmentNotes') as string;
              if (!quranReadingLevel || !hifzLevel || !arabicLevel || !behaviorReadiness) return;
              await submitPlacementAssessment(trial.id, {
                quranReadingLevel,
                hifzLevel,
                arabicLevel,
                behaviorReadiness,
                recommendedClassId,
                assessmentNotes,
              });
            };

            return (
              <form key={trial.id} action={submitAction}>
                <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--fg)' }}>
                    {trial.studentFirstName} {trial.studentLastName}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Guardian: {trial.guardianName}
                    {trial.scheduledDate ? ` · Scheduled ${trial.scheduledDate}` : ''}
                  </div>

                  <div className="field">
                    <label className="text-label">Quran reading level</label>
                    <input type="text" name="quranReadingLevel" required placeholder="e.g. Reads with support, working on tajweed" className="form-input" />
                  </div>
                  <div className="field">
                    <label className="text-label">Hifz level</label>
                    <input type="text" name="hifzLevel" required placeholder="e.g. Has memorized Juz Amma" className="form-input" />
                  </div>
                  <div className="field">
                    <label className="text-label">Arabic level</label>
                    <input type="text" name="arabicLevel" required placeholder="e.g. Beginner, some letter recognition" className="form-input" />
                  </div>
                  <div className="field">
                    <label className="text-label">Behavior / readiness</label>
                    <input type="text" name="behaviorReadiness" required placeholder="e.g. Attentive, ready for a group class" className="form-input" />
                  </div>
                  <div className="field">
                    <label className="text-label">Recommended class</label>
                    <select name="recommendedClassId" className="form-select" defaultValue="">
                      <option value="">— No recommendation yet —</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="text-label">Notes for parent/admin (optional)</label>
                    <textarea name="assessmentNotes" className="form-textarea" rows={2} placeholder="Any additional detail" />
                  </div>
                  <SubmitButton className="btn btn-accent" style={{ alignSelf: 'flex-start' }} pendingLabel="Submitting…">
                    Submit assessment
                  </SubmitButton>
                </div>
              </form>
            );
          })}
        </div>
      )}
    </>
  );
}
