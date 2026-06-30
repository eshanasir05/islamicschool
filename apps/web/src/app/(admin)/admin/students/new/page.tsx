import { env } from '@/env';
import { createStudent } from '../../../actions';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { SubmitButton } from '@/components/ui/submit-button';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  marginBottom: 5,
};

export default async function NewStudentPage() {
  const createAction = async (formData: FormData) => {
    'use server';
    const fullName = (formData.get('fullName') as string)?.trim();
    const dateOfBirth = formData.get('dateOfBirth') as string;
    const gender = (formData.get('gender') as string) || undefined;
    if (!fullName || !dateOfBirth) return;
    await createStudent(env.NEXT_PUBLIC_ORG_ID, { fullName, dateOfBirth, gender });
  };

  return (
    <main className="app-main">
      <Breadcrumb
        items={[
          { label: 'Students', href: '/admin/students' },
          { label: 'Add student' },
        ]}
      />
      <h1 className="text-h1" style={{ marginBottom: 24 }}>Add student</h1>
      <form action={createAction}>
        <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input type="text" name="fullName" required placeholder="e.g. Aisha Hassan" className="sign-in-input" style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label style={labelStyle}>Date of birth</label>
            <input type="date" name="dateOfBirth" required className="sign-in-input" style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label style={labelStyle}>Gender (optional)</label>
            <select name="gender" className="sign-in-input" style={{ marginBottom: 0 }}>
              <option value="">— Select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Link href="/admin/students" className="btn btn-ghost" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
              Cancel
            </Link>
            <SubmitButton className="btn btn-accent" style={{ flex: 2 }} pendingLabel="Adding…">
              Add student
            </SubmitButton>
          </div>
        </div>
      </form>
    </main>
  );
}
