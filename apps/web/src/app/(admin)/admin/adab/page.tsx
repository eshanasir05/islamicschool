import { env } from '@/env';
import { getAdminAdabHighlights } from '../../actions';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';

export default async function AdminAdabPage() {
  const highlights = await getAdminAdabHighlights(env.NEXT_PUBLIC_ORG_ID);

  return (
    <main className="app-main">
      <h1 className="text-h1" style={{ marginTop: 24, marginBottom: 6 }}>Adab highlights</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Recent praise moments from across the school — respect, kindness, effort, and everything
        teachers noticed.
      </p>

      {highlights.length === 0 ? (
        <EmptyState
          icon="sparkle"
          title="No adab highlights yet"
          body="As teachers add praise notes during class sessions, recent highlights will appear here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {highlights.map(note => (
            <div key={note.id} className="app-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {note.student && (
                    <Link href={`/admin/students/${note.studentId}`} style={{ fontWeight: 500, color: 'var(--fg)', textDecoration: 'none' }}>
                      {note.student.fullName}
                    </Link>
                  )}
                  {note.category && <span className="badge badge-praise">{note.category}</span>}
                  {note.class?.name && (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{note.class.name}</span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55, margin: 0 }}>&ldquo;{note.content}&rdquo;</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
