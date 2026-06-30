import { env } from '@/env';
import { getAdminClassDetail, getAdminTeachers, updateClass } from '../../../../actions';
import { notFound } from 'next/navigation';
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

type Props = { params: Promise<{ classId: string }> };

export default async function EditClassPage({ params }: Props) {
  const { classId } = await params;
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const [{ cls }, teachers] = await Promise.all([
    getAdminClassDetail(classId, orgId),
    getAdminTeachers(orgId),
  ]);
  if (!cls) notFound();

  const updateAction = async (formData: FormData) => {
    'use server';
    const name = (formData.get('name') as string)?.trim();
    const gradeLevel = (formData.get('gradeLevel') as string)?.trim() || undefined;
    const academicYear = (formData.get('academicYear') as string)?.trim() || undefined;
    const capacity = (formData.get('capacity') as string) || undefined;
    const primaryTeacherId = (formData.get('primaryTeacherId') as string) || undefined;
    if (!name) return;
    await updateClass(classId, env.NEXT_PUBLIC_ORG_ID, { name, gradeLevel, academicYear, capacity, primaryTeacherId });
  };

  return (
    <main className="app-main">
      <Breadcrumb
        items={[
          { label: 'Classes', href: '/admin/classes' },
          { label: cls.name, href: `/admin/classes/${classId}` },
          { label: 'Edit' },
        ]}
      />
      <h1 className="text-h1" style={{ marginBottom: 24 }}>Edit class</h1>
      <form action={updateAction}>
        <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Class name</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={cls.name}
              className="sign-in-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Teacher</label>
            <select name="primaryTeacherId" defaultValue={cls.primaryTeacherId ?? ''} className="sign-in-input" style={{ marginBottom: 0 }}>
              <option value="">— Unassigned —</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Grade level (optional)</label>
            <input
              type="text"
              name="gradeLevel"
              defaultValue={cls.gradeLevel ?? ''}
              placeholder="e.g. K-2, 3-5"
              className="sign-in-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Academic year (optional)</label>
            <input
              type="text"
              name="academicYear"
              defaultValue={cls.academicYear ?? ''}
              placeholder="e.g. 2025-2026"
              className="sign-in-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Capacity (optional)</label>
            <input
              type="number"
              name="capacity"
              min={1}
              defaultValue={cls.capacity ?? ''}
              placeholder="e.g. 20"
              className="sign-in-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Link href={`/admin/classes/${classId}`} className="btn btn-ghost" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
              Cancel
            </Link>
            <SubmitButton className="btn btn-accent" style={{ flex: 2 }} pendingLabel="Saving…">
              Save changes
            </SubmitButton>
          </div>
        </div>
      </form>
    </main>
  );
}
