import { env } from '@/env';
import { getAdminStudent, updateStudent } from '../../../../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  marginBottom: 5,
};

type Props = { params: Promise<{ studentId: string }> };

export default async function EditStudentPage({ params }: Props) {
  const { studentId } = await params;
  const { student } = await getAdminStudent(studentId, env.NEXT_PUBLIC_ORG_ID);
  if (!student) notFound();

  const updateAction = async (formData: FormData) => {
    'use server';
    const fullName = (formData.get('fullName') as string)?.trim();
    const dateOfBirth = formData.get('dateOfBirth') as string;
    const gender = (formData.get('gender') as string) || undefined;
    const medicalNotes = (formData.get('medicalNotes') as string)?.trim() || undefined;
    if (!fullName || !dateOfBirth) return;
    await updateStudent(studentId, env.NEXT_PUBLIC_ORG_ID, { fullName, dateOfBirth, gender, medicalNotes });
  };

  // dateOfBirth comes back as a string "YYYY-MM-DD" from Drizzle date columns
  const dobValue = student.dateOfBirth ?? '';

  return (
    <main className="app-main">
      <Link
        href={`/admin/students/${studentId}`}
        style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginTop: 16, marginBottom: 16 }}
      >
        ← Back to student
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 24px', color: 'var(--fg)' }}>Edit student</h1>
      <form action={updateAction}>
        <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input
              type="text"
              name="fullName"
              required
              defaultValue={student.fullName}
              className="sign-in-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Date of birth</label>
            <input
              type="date"
              name="dateOfBirth"
              required
              defaultValue={dobValue}
              className="sign-in-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Gender (optional)</label>
            <select name="gender" defaultValue={student.gender ?? ''} className="sign-in-input" style={{ marginBottom: 0 }}>
              <option value="">— Select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Medical notes (optional)</label>
            <textarea
              name="medicalNotes"
              defaultValue={student.medicalNotes ?? ''}
              className="note-textarea"
              rows={3}
              placeholder="Allergies, conditions, etc."
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Link href={`/admin/students/${studentId}`} className="btn btn-ghost" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
              Cancel
            </Link>
            <button type="submit" className="btn btn-accent" style={{ flex: 2 }}>
              Save changes
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
