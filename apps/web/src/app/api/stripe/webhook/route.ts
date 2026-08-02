import { env } from '@/env';
import { db, schema } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const processed = await db.transaction(async (transaction) => {
    const [claim] = await transaction
      .insert(schema.stripeWebhookEvents)
      .values({ stripeEventId: event.id, eventType: event.type })
      .onConflictDoNothing()
      .returning({ stripeEventId: schema.stripeWebhookEvents.stripeEventId });

    if (!claim) return false;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const planId = session.metadata?.planId;
        const checkoutSessionId = typeof session.id === 'string' ? session.id : null;
        if (!planId || !checkoutSessionId) break;

        await transaction
          .update(schema.tuitionPlans)
          .set({
            stripeSubscriptionId:
              typeof session.subscription === 'string' ? session.subscription : null,
            status: 'active',
          })
          .where(
            and(
              eq(schema.tuitionPlans.id, planId),
              eq(schema.tuitionPlans.stripeCheckoutSessionId, checkoutSessionId),
            ),
          );
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as unknown as {
          subscription?: string | null;
          amount_paid: number;
          currency: string;
          payment_intent?: string | null;
          hosted_invoice_url?: string | null;
          status_transitions?: { paid_at?: number | null };
        };
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : null;
        if (!subscriptionId) break;

        const plan = await transaction.query.tuitionPlans.findFirst({
          where: eq(schema.tuitionPlans.stripeSubscriptionId, subscriptionId),
          with: { student: { columns: { fullName: true } } },
        });
        if (!plan?.guardianUserId) break;

        const stripePaymentIntentId =
          typeof invoice.payment_intent === 'string' ? invoice.payment_intent : null;
        const [payment] = await transaction
          .insert(schema.payments)
          .values({
            organizationId: plan.organizationId,
            tuitionPlanId: plan.id,
            payerUserId: plan.guardianUserId,
            amountCents: invoice.amount_paid,
            currency: invoice.currency.toUpperCase(),
            paymentMethod: 'card',
            stripePaymentIntentId,
            status: 'succeeded',
            receiptUrl: invoice.hosted_invoice_url ?? null,
            paidAt: new Date(
              invoice.status_transitions?.paid_at
                ? invoice.status_transitions.paid_at * 1000
                : Date.now(),
            ),
          })
          .onConflictDoNothing()
          .returning({ id: schema.payments.id });

        if (!payment) break;

        await transaction.insert(schema.notifications).values({
          organizationId: plan.organizationId,
          userId: plan.guardianUserId,
          type: 'payment_succeeded',
          title: 'Payment received',
          body: `${formatCents(invoice.amount_paid, invoice.currency)} — thank you.`,
          link: `/parent/${plan.studentId}`,
        });

        await transaction.insert(schema.activityLog).values({
          organizationId: plan.organizationId,
          actorUserId: null,
          actorName: 'Stripe',
          action: 'payment.succeeded',
          targetType: 'tuition_plan',
          targetId: plan.id,
          metadata: {
            targetLabel: plan.student?.fullName ?? 'a student',
            amount: formatCents(invoice.amount_paid, invoice.currency),
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await transaction
          .update(schema.tuitionPlans)
          .set({ status: 'cancelled' })
          .where(eq(schema.tuitionPlans.stripeSubscriptionId, subscription.id));
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as { subscription?: string | null };
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : null;
        if (!subscriptionId) break;

        const plan = await transaction.query.tuitionPlans.findFirst({
          where: eq(schema.tuitionPlans.stripeSubscriptionId, subscriptionId),
          with: { student: { columns: { fullName: true } } },
        });
        if (!plan) break;

        await transaction
          .update(schema.tuitionPlans)
          .set({ status: 'past_due' })
          .where(eq(schema.tuitionPlans.id, plan.id));

        if (plan.guardianUserId) {
          await transaction.insert(schema.notifications).values({
            organizationId: plan.organizationId,
            userId: plan.guardianUserId,
            type: 'payment_failed',
            title: 'Payment failed',
            body: 'We could not process your tuition payment. Please update your billing information.',
            link: `/parent/${plan.studentId}`,
          });
        }

        await transaction.insert(schema.activityLog).values({
          organizationId: plan.organizationId,
          actorUserId: null,
          actorName: 'Stripe',
          action: 'payment.failed',
          targetType: 'tuition_plan',
          targetId: plan.id,
          metadata: { targetLabel: plan.student?.fullName ?? 'a student' },
        });
        break;
      }
    }

    return true;
  });

  return NextResponse.json({ received: true, duplicate: !processed });
}
