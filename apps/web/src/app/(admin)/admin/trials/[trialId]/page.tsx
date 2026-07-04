import { env } from '@/env';
import { notFound } from 'next/navigation';
import { getTrialDetail, getAdminClasses, cancelTrialPlacement, convertTrialToStudent } from '../../../actions';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { ToastOnParam } from '@/components/ui/toast-on-param';
import { SubmitButton } from '@/components/ui/submit-button';
import { EmptyState } from '@/components/ui/empty-state';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  marginBottom: 5,
};

const statusBadge: Record<string, string> = {
  scheduled: 'badge badge-late',
  assessed: 'badge badge-sabqi',
  converted: 'badge badge-present',
  cancelled: 'badge badge-absent',
};

type Props = {
  params: Promise<{ trialId: string }>;
  searchParams: Promise<{ notice?: string }>;
};

export default async function TrialDetailPage({ params, searchParams }: Props) {
  const { trialId } = await params;
  const { notice } = await searchParams;
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const [trial, classes] = await Promise.all([
    getTrialDetail(trialId, orgId),
    getAdminClasses(orgId),
  ]);
  if (!trial) notFound();

  const cancelAction = async () => {
    'use server';
    await cancelTrialPlacement(trialId, orgId);
  };

  const convertAction = async (formData: FormData) => {
    'use server';
    const dateOfBirth = formData.get('dateOfBirth') as string;
    const classId = formData.get('classId') as string;
    if (!dateOfBirth || !classId) return;
    await convertTrialToStudent(trialId, orgId, { dateOfBirth, classId });
  };

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
      <Breadcrumb items={[{ label: 'Trial classes', href: '/admin/trials' }, { label: `${trial.studentFirstName} ${trial.studentLastName}` }]} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <h1 className="text-h1">{trial.studentFirstName} {trial.studentLastName}</h1>
        <span className={statusBadge[trial.status] ?? 'badge'} style={{ textTransform: 'capitalize' }}>{trial.status}</span>
      </div>

      <div className="app-card" style={{ marginBottom: 20, fontSize: 14 }}>
        <div style={{ marginBottom: 6 }}><strong>Guardian:</strong> {trial.guardianName} · {trial.guardianEmail}{trial.guardianPhone ? ` · ${trial.guardianPhone}` : ''}</div>
        {trial.scheduledDate && <div style={{ marginBottom: 6 }}><strong>Scheduled:</strong> {trial.scheduledDate}</div>}
        <div><strong>Assigned teacher:</strong> {trial.assignedTeacher?.fullName ?? 'Not yet assigned'}</div>
      </div>

      {/* Placement assessment */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Placement assessment</h2>
        {trial.status === 'scheduled' ? (
          <EmptyState
            icon="cal"
            title="Waiting on the teacher's assessment"
            body="Once the assigned teacher completes the placement assessment from their portal, it will appear here."
          />
        ) : (
          <div className="app-card" style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><strong>Quran reading level:</strong> {trial.quranReadingLevel}</div>
            <div><strong>Hifz level:</strong> {trial.hifzLevel}</div>
            <div><strong>Arabic level:</strong> {trial.arabicLevel}</div>
            <div><strong>Behavior / readiness:</strong> {trial.behaviorReadiness}</div>
            <div><strong>Recommended class:</strong> {trial.recommendedClass?.name ?? '—'}</div>
            {trial.assessmentNotes && <div><strong>Notes:</strong> {trial.assessmentNotes}</div>}
          </div>
        )}
      </div>

      {/* Convert to student */}
      {trial.status === 'assessed' && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Convert to enrolled student</h2>
          <form action={convertAction}>
            <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Date of birth</label>
                <input type="date" name="dateOfBirth" required className="sign-in-input" style={{ marginBottom: 0 }} />
              </div>
              <div>
                <label style={labelStyle}>Class</label>
                <select name="classId" required className="sign-in-input" style={{ marginBottom: 0 }} defaultValue={trial.recommendedClassId ?? ''}>
                  <option value="" disabled>— Select a class —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <SubmitButton className="btn btn-accent" pendingLabel="Enrolling…">
                Convert to enrolled student
              </SubmitButton>
            </div>
          </form>
        </div>
      )}

      {trial.status === 'converted' && trial.convertedStudent && (
        <div className="banner banner-success" style={{ marginBottom: 20 }}>
          Converted to an enrolled student: {trial.convertedStudent.fullName}
        </div>
      )}

      {(trial.status === 'scheduled' || trial.status === 'assessed') && (
        <form action={cancelAction}>
          <ConfirmSubmit
            label="Cancel trial"
            title="Cancel this trial?"
            body="This trial will be marked cancelled. You can always schedule a new one for this family later."
            confirmLabel="Cancel trial"
            variant="danger"
            className="btn btn-ghost"
          />
        </form>
      )}
    </main>
  );
}
