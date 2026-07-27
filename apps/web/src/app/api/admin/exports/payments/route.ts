import { env } from '@/env';
import { logActivity } from '@/lib/activity-log';
import { getAdminActorForOrg } from '@/lib/admin-auth';
import { buildCsv, csvResponse } from '@/lib/csv';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Alias payer users table to avoid collision with guardian join
const payerUsers = schema.users;

export async function GET() {
  const orgId = env.NEXT_PUBLIC_ORG_ID;
  const caller = await getAdminActorForOrg(orgId);
  if (!caller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await db
    .select({
      paymentId: schema.payments.id,
      amountCents: schema.payments.amountCents,
      currency: schema.payments.currency,
      paymentStatus: schema.payments.status,
      stripePaymentIntentId: schema.payments.stripePaymentIntentId,
      receiptUrl: schema.payments.receiptUrl,
      paidAt: schema.payments.paidAt,
      paymentCreatedAt: schema.payments.createdAt,
      planFrequency: schema.tuitionPlans.frequency,
      stripeCheckoutSessionId: schema.tuitionPlans.stripeCheckoutSessionId,
      studentName: schema.students.fullName,
      parentName: payerUsers.fullName,
      parentEmail: payerUsers.email,
    })
    .from(schema.payments)
    .innerJoin(schema.tuitionPlans, eq(schema.tuitionPlans.id, schema.payments.tuitionPlanId))
    .innerJoin(schema.students, eq(schema.students.id, schema.tuitionPlans.studentId))
    .innerJoin(payerUsers, eq(payerUsers.id, schema.payments.payerUserId))
    .where(eq(schema.payments.organizationId, orgId))
    .orderBy(schema.payments.paidAt);

  const headers = [
    'payment_id',
    'student_name',
    'parent_name',
    'parent_email',
    'plan_frequency',
    'amount',
    'currency',
    'status',
    'stripe_checkout_session_id',
    'stripe_payment_intent_id',
    'receipt_url',
    'paid_at',
    'created_at',
  ];

  const data = rows.map((r) => [
    r.paymentId,
    r.studentName,
    r.parentName,
    r.parentEmail,
    r.planFrequency,
    r.amountCents !== null ? (r.amountCents / 100).toFixed(2) : null,
    r.currency,
    r.paymentStatus,
    r.stripeCheckoutSessionId,
    r.stripePaymentIntentId,
    r.receiptUrl,
    r.paidAt ? new Date(r.paidAt).toISOString() : null,
    r.paymentCreatedAt ? new Date(r.paymentCreatedAt).toISOString() : null,
  ]);

  await logActivity({
    organizationId: orgId,
    actorUserId: caller.userId,
    actorName: caller.name,
    action: 'csv_export.downloaded',
    targetType: 'payments_export',
    targetId: null,
    metadata: { targetLabel: 'tuition/payments' },
  });

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(buildCsv(headers, data), `talibly-tuition-${date}.csv`);
}
