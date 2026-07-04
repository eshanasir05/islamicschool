import { ExportButton } from '@/components/ui/export-button';

const EXPORTS = [
  {
    title: 'Student Roster',
    description: 'All students with class assignment, primary guardian name and email, and enrollment status.',
    filename: 'talibly-roster-YYYY-MM-DD.csv',
    href: '/api/admin/exports/students',
    columns: ['student_id', 'student_name', 'grade_level', 'class_name', 'parent_name', 'parent_email', 'enrollment_status', 'enrolled_at', 'created_at'],
  },
  {
    title: 'Tuition Ledger',
    description: 'All recorded tuition payments with Stripe IDs, receipt URLs, and payer details.',
    filename: 'talibly-tuition-YYYY-MM-DD.csv',
    href: '/api/admin/exports/payments',
    columns: ['payment_id', 'student_name', 'parent_name', 'parent_email', 'plan_frequency', 'amount', 'currency', 'status', 'stripe_checkout_session_id', 'stripe_payment_intent_id', 'receipt_url', 'paid_at', 'created_at'],
  },
  {
    title: 'Attendance Records',
    description: 'Full attendance history for all students across all sessions, with class name and teacher.',
    filename: 'talibly-attendance-YYYY-MM-DD.csv',
    href: '/api/admin/exports/attendance',
    columns: ['attendance_id', 'date', 'student_name', 'class_name', 'status', 'notes', 'recorded_by', 'created_at'],
  },
  {
    title: 'Hifz Progress',
    description: 'Every recorded hifz session — surah, ayah range, stream, and whether audio was captured.',
    filename: 'talibly-hifz-YYYY-MM-DD.csv',
    href: '/api/admin/exports/hifz',
    columns: ['hifz_id', 'date', 'student_name', 'class_name', 'stream', 'surah_number', 'ayah_start', 'ayah_end', 'accuracy_score', 'has_audio', 'recorded_by', 'created_at'],
  },
];

export default function ExportsPage() {
  return (
    <main className="app-main">
      <h1 className="text-h1" style={{ marginTop: 24, marginBottom: 6 }}>Exports</h1>
      <p className="text-body" style={{ marginBottom: 24 }}>
        Download school data as CSV. All exports are scoped to this school only.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {EXPORTS.map(exp => (
          <div key={exp.href} className="app-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg)', marginBottom: 4 }}>{exp.title}</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>{exp.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {exp.columns.map(col => (
                    <span
                      key={col}
                      style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--surface-2, #f3f4f6)',
                        color: 'var(--muted)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
              <ExportButton href={exp.href} label="↓ Download CSV" />
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 20 }}>
        Files are generated fresh on each download. Dates in filenames reflect today&apos;s date.
      </p>
    </main>
  );
}
