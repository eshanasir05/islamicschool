const EXPORTS = [
  {
    title: 'Student Roster',
    description: 'All students with class assignment, primary guardian name and email, and enrollment status.',
    filename: 'students-YYYY-MM-DD.csv',
    href: '/api/admin/exports/students',
    columns: ['student_id', 'student_name', 'grade_level', 'class_name', 'parent_name', 'parent_email', 'enrollment_status', 'enrolled_at', 'created_at'],
  },
  {
    title: 'Payment History',
    description: 'All recorded tuition payments with Stripe IDs, receipt URLs, and payer details.',
    filename: 'payments-YYYY-MM-DD.csv',
    href: '/api/admin/exports/payments',
    columns: ['payment_id', 'student_name', 'parent_name', 'parent_email', 'plan_frequency', 'amount', 'currency', 'status', 'stripe_checkout_session_id', 'stripe_payment_intent_id', 'receipt_url', 'paid_at', 'created_at'],
  },
  {
    title: 'Attendance Records',
    description: 'Full attendance history for all students across all sessions, with class name and teacher.',
    filename: 'attendance-YYYY-MM-DD.csv',
    href: '/api/admin/exports/attendance',
    columns: ['attendance_id', 'date', 'student_name', 'class_name', 'status', 'notes', 'recorded_by', 'created_at'],
  },
];

export default function ExportsPage() {
  return (
    <main className="app-main">
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '24px 0 6px', color: 'var(--fg)' }}>Exports</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
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
              <a
                href={exp.href}
                download
                className="btn btn-accent"
                style={{ fontSize: 13, padding: '7px 14px', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                ↓ Download CSV
              </a>
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
