import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { getGuardianStudents, getStudentMilestones } from '../../../actions';
import { QuranFilters } from './filters';

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ type?: string; date?: string }>;
};

const MILESTONE_TYPES = new Set(['all', 'surah_completed', 'juz_completed', 'revision_completed']);
const DATE_WINDOWS = new Set(['all', 'last_30', 'last_90', 'this_year']);

function shortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isWithinDateWindow(dateStr: string, window: string) {
  if (window === 'all') return true;

  const achieved = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (window === 'this_year') return achieved.getFullYear() === today.getFullYear();

  const days = window === 'last_30' ? 30 : 90;
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - days);
  return achieved >= cutoff && achieved <= today;
}

export default async function ParentQuranProgressPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const rawSearch = await searchParams;
  const type = MILESTONE_TYPES.has(rawSearch.type ?? 'all') ? (rawSearch.type ?? 'all') : 'all';
  const date = DATE_WINDOWS.has(rawSearch.date ?? 'all') ? (rawSearch.date ?? 'all') : 'all';
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const students = await getGuardianStudents(user.id);
  const student = students.find((s) => s?.id === studentId);
  if (!student) notFound();

  const allMilestones = await getStudentMilestones(studentId);
  const milestones = allMilestones.filter((m) => {
    if (type !== 'all' && m.type !== type) return false;
    if (!isWithinDateWindow(m.achievedDate, date)) return false;
    return true;
  });

  return (
    <main className="app-main">
      <Breadcrumb
        items={[
          { label: student.fullName, href: `/parent/${studentId}` },
          { label: 'Quran progress' },
        ]}
      />
      <h1 className="text-h1" style={{ marginBottom: 6 }}>
        {student.fullName}&apos;s Quran progress
      </h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Hifz milestones recorded by the teacher, most recent first.
      </p>

      {allMilestones.length > 0 && (
        <QuranFilters pathname={`/parent/${studentId}/quran`} type={type} date={date} />
      )}

      {allMilestones.length === 0 ? (
        <EmptyState
          icon="star"
          title="No milestones recorded yet"
          body="As your child reaches hifz milestones, the teacher will record them here."
        />
      ) : milestones.length === 0 ? (
        <EmptyState
          icon="star"
          title="No Quran progress matches these filters"
          body="Try a different filter, or clear filters to see every milestone."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {milestones.map((m) => (
            <div key={m.id} className="app-card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{m.label}</span>
                <span className="badge badge-sabak" style={{ whiteSpace: 'nowrap' }}>
                  {shortDate(m.achievedDate)}
                </span>
              </div>
              {m.teacherNotes && (
                <p
                  style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5, margin: '8px 0 0' }}
                >
                  {m.teacherNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
