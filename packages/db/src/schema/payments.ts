import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { tuitionPlans } from './tuition';
import { users } from './users';

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    tuitionPlanId: uuid('tuition_plan_id').references(() => tuitionPlans.id),
    payerUserId: uuid('payer_user_id')
      .notNull()
      .references(() => users.id),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull(),
    deductibleAmountCents: integer('deductible_amount_cents'),
    paymentMethod: text('payment_method'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    status: text('status', {
      enum: ['pending', 'succeeded', 'failed', 'refunded'],
    }).notNull(),
    receiptUrl: text('receipt_url'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('payments_stripe_payment_intent_unique').on(table.stripePaymentIntentId)],
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
