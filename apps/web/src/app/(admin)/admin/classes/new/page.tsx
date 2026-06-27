import { env } from '@/env';
import { createClass, getAdminTeachers } from '../../../actions';
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

export default async function NewClassPage() {
  const teachers = await getAdminTeachers(env.NEXT_PUBLIC_ORG_ID);

  const createAction = async (formData: FormData) => {
    'use server';
    const name = (formData.get('name') as string)?.trim();
    const gradeLevel = (formData.get('gradeLevel') as string)?.trim() || undefined;
    const academicYear = (formData.get('academicYear') as string)?.trim() || undefined;
    const capacityRaw = formData.get('capacity') as string;
    const capacity = capacityRaw ? Number(capacityRaw) : undefined;
    const primaryTeacherId = (formData.get('primaryTeacherId') as string) || undefined;
    if (!name) return;
    await createClass(env.NEXT_PUBLIC_ORG_ID, { name, gradeLevel, academicYear, capacity, primaryTeacherId });
  };

  return (
    <main className="app-main">
      <Link
        href="/admin/classes"
        style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginTop: 16, marginBottom: 16 }}
      >
        ← All classes
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 24px', color: 'var(--fg)' }}>Add class</h1>
      <form action={createAction}>
        <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Class name</label>
            <input type="text" name="name" required placeholder="e.g. Beginners Quran" className="sign-in-input" style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label style={labelStyle}>Teacher (optional)</label>
            <select name="primaryTeacherId" className="sign-in-input" style={{ marginBottom: 0 }}>
              <option value="">— Unassigned —</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Grade level (optional)</label>
            <input type="text" name="gradeLevel" placeholder="e.g. K-2, 3-5, Middle" className="sign-in-input" style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label style={labelStyle}>Academic year (optional)</label>
            <input type="text" name="academicYear" placeholder="e.g. 2025-2026" className="sign-in-input" style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label style={labelStyle}>Capacity (optional)</label>
            <input type="number" name="capacity" min={1} placeholder="e.g. 20" className="sign-in-input" style={{ marginBottom: 0 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Link href="/admin/classes" className="btn btn-ghost" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
              Cancel
            </Link>
            <button type="submit" className="btn btn-accent" style={{ flex: 2 }}>
              Add class
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
