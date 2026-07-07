import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAllParentTuition, createParentPaymentSession } from '../../actions';
import { EmptyState } from '@/components/ui/empty-state';
import { ToastOnParam } from '@/components/ui/toast-on-param';

type Props = { searchParams: Promise<{ notice?: string }> };

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  succeeded: 'badge-paid',
  pending: 'badge-pending',
  failed: 'badge-failed',
  refunded: 'badge-cancelled',
};

export default async function ParentBillingPage({ searchParams }: Props) {
  const { notice } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const rows = await getAllParentTuition(user.id);

  async function payNowAction(formData: FormData) {
    'use server';
    const planId = formData.get('planId') as string;
    const studentId = formData.get('studentId') as string;
    if (planId && studentId) await createParentPaymentSession(planId, studentId);
  }

  return (
    <main className="app-main-wide">
      <ToastOnParam notice={notice} />
      <Link href="/parent" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>← Back to dashboard</Link>
      <h1 className="text-h1" style={{ marginTop: 12, marginBottom: 24 }}>Billing</h1>

      {rows.length === 0 ? (
        <EmptyState
          icon="money"
          title="No children linked"
          body="Contact your school to link your children to your account."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {rows.map(({ student, plan }) => (
            <div key={student.id} className="app-card">
              <h2 className="text-h2" style={{ marginBottom: 14 }}>{student.fullName}</h2>

              {!plan ? (
                <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>No billing plan set up yet for {student.fullName.split(' ')[0]}.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--fg)' }}>
                        {money(plan.amountCents, plan.currency)}
                        <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--muted)' }}>
                          {' '}/ {plan.frequency === 'one_time' ? 'one time' : plan.frequency}
                        </span>
                      </div>
                      {plan.baseAmountCents && (
                        <div style={{ fontSize: 12, color: 'var(--accent-700)', marginTop: 2 }}>
                          {plan.discountReason ?? 'Discount applied'} — was{' '}
                          <span style={{ textDecoration: 'line-through' }}>{money(plan.baseAmountCents, plan.currency)}</span>
                        </div>
                      )}
                    </div>
                    <span className={`badge badge-${plan.status}`} style={{ textTransform: 'capitalize' }}>
                      {plan.status.replace('_', ' ')}
                    </span>
                  </div>

                  {plan.status === 'pending_payment' && (
                    <div className="card-attention" style={{ marginTop: 12, padding: '12px 14px' }}>
                      <p style={{ fontSize: 13, color: 'var(--warn-fg)', margin: '0 0 10px' }}>
                        This tuition plan is ready. Complete payment to activate it.
                      </p>
                      <form action={payNowAction}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="studentId" value={student.id} />
                        <button type="submit" className="btn btn-accent" style={{ fontSize: 13, padding: '8px 18px' }}>
                          Pay now →
                        </button>
                      </form>
                    </div>
                  )}

                  {plan.status === 'past_due' && (
                    <div className="card-danger" style={{ marginTop: 12, padding: '12px 14px' }}>
                      <p style={{ fontSize: 13, color: 'var(--danger-fg)', margin: '0 0 10px' }}>
                        A recent payment failed. Please update your payment method to continue.
                      </p>
                      <form action={payNowAction}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="studentId" value={student.id} />
                        <button type="submit" className="btn btn-accent" style={{ fontSize: 13, padding: '8px 18px' }}>
                          Update billing →
                        </button>
                      </form>
                    </div>
                  )}

                  {plan.status === 'active' && (
                    <form action={payNowAction} style={{ marginTop: 12 }}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <input type="hidden" name="studentId" value={student.id} />
                      <button type="submit" className="btn btn-ghost" style={{ fontSize: 13, padding: '7px 16px' }}>
                        Manage billing →
                      </button>
                    </form>
                  )}

                  {plan.payments.length > 0 && (
                    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 8 }}>
                        Payment history
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {plan.payments.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                            <div style={{ color: 'var(--fg)' }}>
                              {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className={`badge ${PAYMENT_STATUS_BADGE[p.status] ?? 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>{p.status}</span>
                              <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{money(p.amountCents, p.currency)}</span>
                              {p.receiptUrl && (
                                <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 12 }}>
                                  Receipt
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
