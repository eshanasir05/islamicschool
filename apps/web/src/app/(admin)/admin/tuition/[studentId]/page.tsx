import { env } from '@/env';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getAdminStudentTuition, createTuitionPlan, cancelTuitionPlan } from '../../../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ payment?: string; checkout_url?: string }>;
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  marginBottom: 5,
};

const statusColor: Record<string, string> = {
  active: 'var(--accent-700)',
  pending_payment: '#b45309',
  past_due: '#991b1b',
  cancelled: 'var(--muted)',
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default async function StudentTuitionPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { payment, checkout_url } = await searchParams;
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const [{ student, plans }, guardians] = await Promise.all([
    getAdminStudentTuition(studentId, orgId),
    db.query.studentGuardians.findMany({
      where: and(eq(schema.studentGuardians.studentId, studentId)),
      with: { guardian: true },
    }),
  ]);
  if (!student) notFound();

  const activePlan = plans.find(p => p.status === 'active' || p.status === 'pending_payment' || p.status === 'past_due');

  const createAction = async (formData: FormData) => {
    'use server';
    const amountDollars = parseFloat(formData.get('amount') as string);
    const frequency = formData.get('frequency') as 'monthly' | 'annual' | 'one_time';
    const startDate = (formData.get('startDate') as string) || undefined;
    const slidingScaleNotes = (formData.get('slidingScaleNotes') as string)?.trim() || undefined;
    // Combined value: "userId|email"
    const guardianValue = formData.get('guardian') as string;
    const [guardianUserId, guardianEmail] = guardianValue.split('|');
    if (!amountDollars || !frequency || !guardianUserId || !guardianEmail) return;
    await createTuitionPlan(env.NEXT_PUBLIC_ORG_ID, studentId, {
      amountCents: Math.round(amountDollars * 100),
      frequency,
      startDate,
      slidingScaleNotes,
      guardianUserId,
      guardianEmail,
      studentName: student.fullName,
    });
  };

  const cancelAction = async (formData: FormData) => {
    'use server';
    const planId = formData.get('planId') as string;
    if (!planId) return;
    await cancelTuitionPlan(planId, env.NEXT_PUBLIC_ORG_ID, studentId);
  };

  return (
    <main className="app-main">
      <Link
        href="/admin/tuition"
        style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginTop: 16, marginBottom: 16 }}
      >
        ← All tuition
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>{student.fullName}</h1>
        <Link href={`/admin/students/${studentId}`} style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
          Student profile →
        </Link>
      </div>

      {payment === 'success' && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#166534' }}>
          Payment successful — subscription is now active.
        </div>
      )}

      {checkout_url && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>Checkout link ready — send to parent</div>
          <div style={{ fontSize: 13, color: '#78350f', marginBottom: 12 }}>
            The parent opens this link, enters their card once, and Stripe handles all future charges automatically.
          </div>
          <input
            type="text"
            readOnly
            defaultValue={decodeURIComponent(checkout_url)}
            className="sign-in-input"
            style={{ marginBottom: 8, fontSize: 12, fontFamily: 'var(--font-mono)' }}
          />
          <div style={{ fontSize: 12, color: '#92400e' }}>Link expires in 24 hours.</div>
        </div>
      )}

      {/* Active plan */}
      {activePlan && (
        <div className="app-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--fg)' }}>
                {formatAmount(activePlan.amountCents, activePlan.currency)}
                <span style={{ fontWeight: 400, fontSize: 14, color: 'var(--muted)' }}>
                  {' '}/ {activePlan.frequency === 'one_time' ? 'one time' : activePlan.frequency}
                </span>
              </div>
              <div style={{ fontSize: 13, marginTop: 4, textTransform: 'capitalize', color: statusColor[activePlan.status] ?? 'var(--muted)' }}>
                {activePlan.status.replace('_', ' ')}
              </div>
            </div>
            {activePlan.status !== 'cancelled' && (
              <form action={cancelAction}>
                <input type="hidden" name="planId" value={activePlan.id} />
                <button type="submit" className="btn btn-ghost" style={{ fontSize: 13, padding: '4px 12px', color: 'var(--muted)' }}>
                  Cancel plan
                </button>
              </form>
            )}
          </div>
          {activePlan.guardian && (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Billing: {activePlan.guardian.fullName ?? activePlan.guardian.email}
            </div>
          )}
          {activePlan.startDate && (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Start: {activePlan.startDate}</div>
          )}
          {activePlan.slidingScaleNotes && (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>{activePlan.slidingScaleNotes}</div>
          )}
        </div>
      )}

      {/* Payment history */}
      {activePlan && activePlan.payments.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>
            Payment history ({activePlan.payments.length})
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Date', 'Amount', 'Method', 'Status', 'Receipt'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activePlan.payments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 8px', color: 'var(--fg)' }}>
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '8px 8px', fontWeight: 500, color: 'var(--fg)' }}>
                      {formatAmount(p.amountCents, p.currency)}
                    </td>
                    <td style={{ padding: '8px 8px', color: 'var(--muted)', textTransform: 'capitalize' }}>
                      {p.paymentMethod ?? '—'}
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <span className={p.status === 'succeeded' ? 'badge badge-present' : 'badge badge-absent'}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      {p.receiptUrl
                        ? <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13 }}>View</a>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activePlan && activePlan.payments.length === 0 && activePlan.status === 'pending_payment' && (
        <div className="feed-empty" style={{ marginTop: 0, marginBottom: 24 }}>
          <p>Waiting for the parent to complete checkout. Send them the link above.</p>
        </div>
      )}

      {/* Create plan form */}
      {!activePlan && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Create tuition plan</h2>
          {guardians.length === 0 ? (
            <div className="feed-empty" style={{ marginTop: 0 }}>
              <p>No guardians linked. <Link href={`/admin/students/${studentId}`} style={{ color: 'var(--accent)' }}>Add a guardian</Link> first — they will be the billing contact.</p>
            </div>
          ) : (
            <form action={createAction}>
              <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Billing guardian</label>
                  <select name="guardian" className="sign-in-input" style={{ marginBottom: 0 }}>
                    {guardians.map(g => (
                      <option key={g.guardianUserId} value={`${g.guardianUserId}|${g.guardian?.email ?? ''}`}>
                        {g.guardian?.fullName ?? g.guardian?.email ?? g.guardianUserId}
                        {g.isPrimary ? ' (primary)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Amount (USD)</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min={1}
                    step="0.01"
                    placeholder="e.g. 75.00"
                    className="sign-in-input"
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Frequency</label>
                  <select name="frequency" className="sign-in-input" style={{ marginBottom: 0 }}>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="one_time">One-time</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Start date (optional)</label>
                  <input type="date" name="startDate" className="sign-in-input" style={{ marginBottom: 0 }} />
                </div>
                <div>
                  <label style={labelStyle}>Notes / sliding scale (optional)</label>
                  <textarea
                    name="slidingScaleNotes"
                    className="note-textarea"
                    rows={2}
                    placeholder="e.g. Sibling discount applied, agreed rate $60/mo"
                  />
                </div>
                <button type="submit" className="btn btn-accent">
                  Create plan & generate checkout link
                </button>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                  Creates a Stripe checkout link. Send it to the parent — they enter their card once and Stripe charges automatically.
                </p>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Cancelled plans */}
      {plans.filter(p => p.status === 'cancelled').length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            Past plans
          </h2>
          {plans.filter(p => p.status === 'cancelled').map(p => (
            <div key={p.id} className="app-card" style={{ opacity: 0.6, fontSize: 14, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--fg)' }}>{formatAmount(p.amountCents, p.currency)} / {p.frequency}</span>
              <span style={{ color: 'var(--muted)' }}>Cancelled</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
