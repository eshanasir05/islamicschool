import { env } from '@/env';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getAdminStudentTuition, getSiblingStudents, createTuitionPlan, cancelTuitionPlan } from '../../../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { ToastOnParam } from '@/components/ui/toast-on-param';
import { SubmitButton } from '@/components/ui/submit-button';
import { EmptyState } from '@/components/ui/empty-state';

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ payment?: string; checkout_url?: string; notice?: string }>;
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default async function StudentTuitionPage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { payment, checkout_url, notice } = await searchParams;
  const orgId = env.NEXT_PUBLIC_ORG_ID;

  const [{ student, plans }, guardians, siblings] = await Promise.all([
    getAdminStudentTuition(studentId, orgId),
    db.query.studentGuardians.findMany({
      where: and(eq(schema.studentGuardians.studentId, studentId)),
      with: { guardian: true },
    }),
    getSiblingStudents(studentId, orgId),
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

    const discountTypeRaw = formData.get('discountType') as string;
    const discountType = discountTypeRaw === 'percent' || discountTypeRaw === 'fixed' ? discountTypeRaw : undefined;
    const discountValueRaw = formData.get('discountValue') as string;
    const discountValue = discountType && discountValueRaw ? parseFloat(discountValueRaw) : undefined;
    const discountReason = (formData.get('discountReason') as string)?.trim() || undefined;

    await createTuitionPlan(env.NEXT_PUBLIC_ORG_ID, studentId, {
      amountCents: Math.round(amountDollars * 100),
      frequency,
      startDate,
      slidingScaleNotes,
      guardianUserId,
      guardianEmail,
      studentName: student.fullName,
      discountType,
      discountValue,
      discountReason,
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
      <ToastOnParam notice={notice} />
      <Breadcrumb
        items={[
          { label: 'Tuition', href: '/admin/tuition' },
          { label: student.fullName },
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="text-h1">{student.fullName}</h1>
        <Link href={`/admin/students/${studentId}`} style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
          Student profile →
        </Link>
      </div>

      {payment === 'success' && (
        <div className="banner banner-success">
          Payment successful — subscription is now active.
        </div>
      )}

      {checkout_url && (
        <div className="card-attention" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--warn-fg)', marginBottom: 8 }}>Checkout link ready — send to parent</div>
          <div style={{ fontSize: 13, color: 'var(--warn-fg)', marginBottom: 12 }}>
            The parent opens this link, enters their card once, and Stripe handles all future charges automatically.
          </div>
          <input
            type="text"
            readOnly
            defaultValue={decodeURIComponent(checkout_url)}
            className="form-input"
            style={{ marginBottom: 8, fontSize: 12, fontFamily: 'var(--font-mono)' }}
          />
          <div style={{ fontSize: 12, color: 'var(--warn-fg)' }}>Link expires in 24 hours.</div>
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
                {activePlan.baseAmountCents && (
                  <span className="badge badge-discount" style={{ marginLeft: 8, fontSize: 11 }}>
                    {activePlan.discountType === 'percent' ? `${activePlan.discountValue}% off` : `$${activePlan.discountValue} off`}
                  </span>
                )}
              </div>
              {activePlan.baseAmountCents && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, textDecoration: 'line-through' }}>
                  {formatAmount(activePlan.baseAmountCents, activePlan.currency)}
                </div>
              )}
              <div style={{ marginTop: 6 }}>
                <span className={`badge badge-${activePlan.status}`} style={{ textTransform: 'capitalize' }}>
                  {activePlan.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            {activePlan.status !== 'cancelled' && (
              <form action={cancelAction}>
                <input type="hidden" name="planId" value={activePlan.id} />
                <ConfirmSubmit
                  label="Cancel plan"
                  title="Cancel this tuition plan?"
                  body="Billing will stop and any active Stripe subscription will be cancelled. This cannot be undone — you would need to create a new plan."
                  confirmLabel="Cancel plan"
                  variant="danger"
                  className="btn btn-ghost"
                  buttonStyle={{ fontSize: 13, padding: '4px 12px', color: 'var(--muted)' }}
                />
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
          {activePlan.discountReason && (
            <div style={{ fontSize: 13, color: 'var(--accent-700)', marginTop: 4, fontStyle: 'italic' }}>{activePlan.discountReason}</div>
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
          <table className="rtable">
            <thead>
              <tr>
                {['Date', 'Amount', 'Method', 'Status', 'Receipt'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activePlan.payments.map(p => (
                <tr key={p.id}>
                  <td data-label="Date">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                  </td>
                  <td data-label="Amount" style={{ fontWeight: 500, color: 'var(--fg)' }}>
                    {formatAmount(p.amountCents, p.currency)}
                  </td>
                  <td data-label="Method" style={{ textTransform: 'capitalize' }}>
                    {p.paymentMethod ?? '—'}
                  </td>
                  <td data-label="Status">
                    <span className={p.status === 'succeeded' ? 'badge badge-present' : 'badge badge-absent'}>
                      {p.status}
                    </span>
                  </td>
                  <td data-label="Receipt">
                    {p.receiptUrl
                      ? <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13 }}>View</a>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activePlan && activePlan.payments.length === 0 && activePlan.status === 'pending_payment' && (
        <div style={{ marginBottom: 24 }}>
          <EmptyState
            icon="money"
            title="Waiting for first payment"
            body="The parent hasn't completed checkout yet. Send them the link above — Stripe handles the rest automatically."
          />
        </div>
      )}

      {/* Create plan form */}
      {!activePlan && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Create tuition plan</h2>
          {guardians.length === 0 ? (
            <EmptyState
              icon="parent"
              title="No billing contact yet"
              body="Link a guardian to this student first — they'll be the billing contact who receives the Stripe checkout."
              cta={{ label: 'Add a guardian', href: `/admin/students/${studentId}` }}
            />
          ) : (
            <form action={createAction}>
              <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label className="text-label">Billing guardian</label>
                  <select name="guardian" className="form-select">
                    {guardians.map(g => (
                      <option key={g.guardianUserId} value={`${g.guardianUserId}|${g.guardian?.email ?? ''}`}>
                        {g.guardian?.fullName ?? g.guardian?.email ?? g.guardianUserId}
                        {g.isPrimary ? ' (primary)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="text-label">Amount (USD)</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min={1}
                    step="0.01"
                    placeholder="e.g. 75.00"
                    className="form-input"
                  />
                </div>
                <div className="field">
                  <label className="text-label">Frequency</label>
                  <select name="frequency" className="form-select">
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="one_time">One-time</option>
                  </select>
                </div>
                <div className="field">
                  <label className="text-label">Start date (optional)</label>
                  <input type="date" name="startDate" className="form-input" />
                </div>

                <div className="card-highlight" style={{ padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-700)', marginBottom: 8 }}>
                    Discount / tuition assistance
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>
                    {siblings.length > 0
                      ? `${student.fullName} shares a guardian with ${siblings.map(s => s.fullName).join(', ')}. `
                      : ''}
                    Apply a sibling discount, scholarship, or other tuition assistance. This is only visible to
                    admins and the family — never shown to teachers.
                  </p>
                  <div className="form-grid" style={{ marginBottom: 10 }}>
                    <select name="discountType" className="form-select" defaultValue="">
                      <option value="">No discount</option>
                      <option value="percent">Percent off</option>
                      <option value="fixed">Fixed $ off</option>
                    </select>
                    <input
                      type="number"
                      name="discountValue"
                      min={0}
                      step="0.01"
                      placeholder="e.g. 10"
                      className="form-input"
                    />
                  </div>
                  <input
                    type="text"
                    name="discountReason"
                    placeholder="Reason (e.g. Scholarship — community fund, Sibling discount)"
                    className="form-input"
                  />
                </div>

                <div className="field">
                  <label className="text-label">Notes (optional)</label>
                  <textarea
                    name="slidingScaleNotes"
                    className="form-textarea"
                    rows={2}
                    placeholder="e.g. agreed rate discussed with family"
                  />
                </div>
                <SubmitButton className="btn btn-accent" pendingLabel="Creating plan…">
                  Create plan & generate checkout link
                </SubmitButton>
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
