import { env } from '@/env';
import { getAdminStudents } from '../../actions';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { ToastOnParam } from '@/components/ui/toast-on-param';

type Props = { searchParams: Promise<{ notice?: string }> };

export default async function StudentsPage({ searchParams }: Props) {
  const { notice } = await searchParams;
  const students = await getAdminStudents(env.NEXT_PUBLIC_ORG_ID);

  return (
    <main className="app-main">
      <ToastOnParam notice={notice} />
      <div className="page-heading">
        <h1 className="text-h1">Students</h1>
        <Link href="/admin/students/new" className="btn btn-accent" style={{ fontSize: 13, padding: '6px 14px', textDecoration: 'none' }}>
          Add student
        </Link>
      </div>
      <p className="text-body" style={{ marginBottom: 24 }}>
        {students.length} enrolled
      </p>

      {students.length === 0 ? (
        <EmptyState
          icon="users"
          title="No students yet"
          body="Add your first student to start tracking attendance, hifz progress, and tuition."
          cta={{ label: 'Add student', href: '/admin/students/new' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {students.map(s => {
            const className = s.enrollments[0]?.class?.name ?? '—';
            const guardianCount = s.guardians.length;
            return (
              <Link key={s.id} href={`/admin/students/${s.id}`} className="app-card-link">
                <div className="app-card is-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{s.fullName}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {className} · {guardianCount} guardian{guardianCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`badge badge-${s.status === 'active' ? 'present' : 'absent'}`} style={{ textTransform: 'capitalize' }}>
                      {s.status}
                    </span>
                    <span style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
