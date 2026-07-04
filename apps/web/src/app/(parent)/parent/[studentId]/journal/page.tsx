import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGuardianStudents, getAdabJournal } from '../../../actions';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';

type Props = { params: Promise<{ studentId: string }> };

export default async function AdabJournalPage({ params }: Props) {
  const { studentId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const students = await getGuardianStudents(user.id);
  const student = students.find(s => s?.id === studentId);
  if (!student) notFound();

  const notes = await getAdabJournal(studentId);

  return (
    <main className="app-main">
      <Breadcrumb items={[{ label: student.fullName, href: `/parent/${studentId}` }, { label: 'Adab journal' }]} />
      <h1 className="text-h1" style={{ marginBottom: 6 }}>{student.fullName}&apos;s adab journal</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        A timeline of the moments teachers noticed — respect, kindness, effort, and everything in
        between.
      </p>

      {notes.length === 0 ? (
        <EmptyState
          icon="sparkle"
          title="No adab moments recorded yet"
          body="As teachers add praise notes during class, they'll show up here as a timeline."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map(note => (
            <div key={note.id} className="app-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {note.category && <span className="badge badge-praise">{note.category}</span>}
                  {note.class?.name && (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{note.class.name}</span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </span>
              </div>
              <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>&ldquo;{note.content}&rdquo;</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
