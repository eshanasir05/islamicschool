import { env } from '@/env';
import { getAdminStudents } from '../../actions';
import Link from 'next/link';

export default async function StudentsPage() {
  const students = await getAdminStudents(env.NEXT_PUBLIC_ORG_ID);

  return (
    <main className="app-main">
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '24px 0 4px', color: 'var(--fg)' }}>Students</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
        {students.length} enrolled
      </p>

      {students.length === 0 ? (
        <div className="feed-empty"><p>No students found. Add students to get started.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {students.map(s => {
            const className = s.enrollments[0]?.class?.name ?? '—';
            const guardianCount = s.guardians.length;
            return (
              <Link
                key={s.id}
                href={`/admin/students/${s.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="app-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
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
