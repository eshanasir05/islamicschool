import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { env } from '@/env';
import { createNotification } from '@/lib/notifications';
import { logActivity } from '@/lib/activity-log';

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const planId = session.metadata?.planId;
      if (!planId) break;

      await db
        .update(schema.tuitionPlans)
        .set({
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          status: 'active',
        })
        .where(eq(schema.tuitionPlans.id, planId));
      break;
    }

    case 'invoice.payment_succeeded': {
      // Use unknown cast — Invoice shape varies by API version
      const invoice = event.data.object as unknown as {
        subscription?: string | null;
        amount_paid: number;
        currency: string;
        payment_intent?: string | null;
        hosted_invoice_url?: string | null;
        status_transitions?: { paid_at?: number | null };
      };
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
      if (!subscriptionId) break;

      const plan = await db.query.tuitionPlans.findFirst({
        where: eq(schema.tuitionPlans.stripeSubscriptionId, subscriptionId),
        with: { student: { columns: { fullName: true } } },
      });
      if (!plan || !plan.guardianUserId) break;

      await db.insert(schema.payments).values({
        organizationId: plan.organizationId,
        tuitionPlanId: plan.id,
        payerUserId: plan.guardianUserId,
        amountCents: invoice.amount_paid,
        currency: invoice.currency.toUpperCase(),
        paymentMethod: 'card',
        stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : null,
        status: 'succeeded',
        receiptUrl: invoice.hosted_invoice_url ?? null,
        paidAt: new Date(invoice.status_transitions?.paid_at ? invoice.status_transitions.paid_at * 1000 : Date.now()),
      });

      await createNotification({
        organizationId: plan.organizationId,
        userId: plan.guardianUserId,
        type: 'payment_succeeded',
        title: 'Payment received',
        body: `${formatCents(invoice.amount_paid, invoice.currency)} — thank you.`,
        link: `/parent/${plan.studentId}`,
      });

      await logActivity({
        organizationId: plan.organizationId, actorUserId: null, actorName: 'Stripe',
        action: 'payment.succeeded', targetType: 'tuition_plan', targetId: plan.id,
        metadata: { targetLabel: plan.student?.fullName ?? 'a student', amount: formatCents(invoice.amount_paid, invoice.currency) },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await db
        .update(schema.tuitionPlans)
        .set({ status: 'cancelled' })
        .where(eq(schema.tuitionPlans.stripeSubscriptionId, sub.id));
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as unknown as { subscription?: string | null };
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
      if (!subscriptionId) break;

      const plan = await db.query.tuitionPlans.findFirst({
        where: eq(schema.tuitionPlans.stripeSubscriptionId, subscriptionId),
        with: { student: { columns: { fullName: true } } },
      });
      if (!plan) break;

      await db
        .update(schema.tuitionPlans)
        .set({ status: 'past_due' })
        .where(eq(schema.tuitionPlans.stripeSubscriptionId, subscriptionId));

      if (plan.guardianUserId) {
        await createNotification({
          organizationId: plan.organizationId,
          userId: plan.guardianUserId,
          type: 'payment_failed',
          title: 'Payment failed',
          body: 'We could not process your tuition payment. Please update your billing information.',
          link: `/parent/${plan.studentId}`,
        });
      }

      await logActivity({
        organizationId: plan.organizationId, actorUserId: null, actorName: 'Stripe',
        action: 'payment.failed', targetType: 'tuition_plan', targetId: plan.id,
        metadata: { targetLabel: plan.student?.fullName ?? 'a student' },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
