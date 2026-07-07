import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGuardianStudents, getStudentMilestones } from '../../../actions';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';

type Props = { params: Promise<{ studentId: string }> };

function shortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function ParentQuranProgressPage({ params }: Props) {
  const { studentId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const students = await getGuardianStudents(user.id);
  const student = students.find(s => s?.id === studentId);
  if (!student) notFound();

  const milestones = await getStudentMilestones(studentId);

  return (
    <main className="app-main">
      <Breadcrumb items={[{ label: student.fullName, href: `/parent/${studentId}` }, { label: 'Quran progress' }]} />
      <h1 className="text-h1" style={{ marginBottom: 6 }}>{student.fullName}&apos;s Quran progress</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Hifz milestones recorded by the teacher, most recent first.
      </p>

      {milestones.length === 0 ? (
        <EmptyState
          icon="star"
          title="No milestones recorded yet"
          body="As your child reaches hifz milestones, the teacher will record them here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {milestones.map(m => (
            <div key={m.id} className="app-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{m.label}</span>
                <span className="badge badge-sabak" style={{ whiteSpace: 'nowrap' }}>{shortDate(m.achievedDate)}</span>
              </div>
              {m.teacherNotes && (
                <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, margin: '8px 0 0' }}>{m.teacherNotes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
