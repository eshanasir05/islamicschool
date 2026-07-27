import { Breadcrumb } from '@/components/ui/breadcrumb';
import { SubmitButton } from '@/components/ui/submit-button';
import { env } from '@/env';
import { createTrialPlacement, getAdminTeachers, getRecentLeadsForTrial } from '../../../actions';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  marginBottom: 5,
};

export default async function NewTrialPage() {
  const orgId = env.NEXT_PUBLIC_ORG_ID;
  const [teachers, leads] = await Promise.all([getAdminTeachers(orgId), getRecentLeadsForTrial()]);

  const createAction = async (formData: FormData) => {
    'use server';
    const studentFirstName = (formData.get('studentFirstName') as string)?.trim();
    const studentLastName = (formData.get('studentLastName') as string)?.trim();
    const guardianName = (formData.get('guardianName') as string)?.trim();
    const guardianEmail = (formData.get('guardianEmail') as string)?.trim();
    const guardianPhone = (formData.get('guardianPhone') as string)?.trim();
    const scheduledDate = formData.get('scheduledDate') as string;
    const assignedTeacherId = formData.get('assignedTeacherId') as string;
    const contactSubmissionId = formData.get('contactSubmissionId') as string;
    if (!studentFirstName || !studentLastName || !guardianName || !guardianEmail) return;

    await createTrialPlacement(orgId, {
      studentFirstName,
      studentLastName,
      guardianName,
      guardianEmail,
      guardianPhone,
      scheduledDate,
      assignedTeacherId,
      contactSubmissionId,
    });
  };

  return (
    <main className="app-main">
      <Breadcrumb
        items={[{ label: 'Trial classes', href: '/admin/trials' }, { label: 'New trial' }]}
      />
      <h1 className="text-h1" style={{ marginBottom: 20 }}>
        Schedule a trial class
      </h1>

      <form action={createAction}>
        <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {leads.length > 0 && (
            <div>
              <label htmlFor="trial-contact-submission" style={labelStyle}>
                From a recent inquiry (optional)
              </label>
              <select
                id="trial-contact-submission"
                name="contactSubmissionId"
                className="sign-in-input"
                style={{ marginBottom: 0 }}
                defaultValue=""
              >
                <option value="">— None, enter details manually —</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.schoolName} — {l.contactName} ({l.email})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="trial-student-first-name" style={labelStyle}>
                Student first name
              </label>
              <input
                id="trial-student-first-name"
                type="text"
                name="studentFirstName"
                required
                className="sign-in-input"
                style={{ marginBottom: 0 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="trial-student-last-name" style={labelStyle}>
                Student last name
              </label>
              <input
                id="trial-student-last-name"
                type="text"
                name="studentLastName"
                required
                className="sign-in-input"
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="trial-guardian-name" style={labelStyle}>
              Guardian name
            </label>
            <input
              id="trial-guardian-name"
              type="text"
              name="guardianName"
              required
              className="sign-in-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="trial-guardian-email" style={labelStyle}>
                Guardian email
              </label>
              <input
                id="trial-guardian-email"
                type="email"
                name="guardianEmail"
                required
                className="sign-in-input"
                style={{ marginBottom: 0 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="trial-guardian-phone" style={labelStyle}>
                Guardian phone (optional)
              </label>
              <input
                id="trial-guardian-phone"
                type="tel"
                name="guardianPhone"
                className="sign-in-input"
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="trial-scheduled-date" style={labelStyle}>
              Scheduled date (optional)
            </label>
            <input
              id="trial-scheduled-date"
              type="date"
              name="scheduledDate"
              className="sign-in-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label htmlFor="trial-assigned-teacher" style={labelStyle}>
              Assign teacher (optional)
            </label>
            <select
              id="trial-assigned-teacher"
              name="assignedTeacherId"
              className="sign-in-input"
              style={{ marginBottom: 0 }}
              defaultValue=""
            >
              <option value="">— Not yet assigned —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton className="btn btn-accent" pendingLabel="Scheduling…">
            Schedule trial
          </SubmitButton>
        </div>
      </form>
    </main>
  );
}
