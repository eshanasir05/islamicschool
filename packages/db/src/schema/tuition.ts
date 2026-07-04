import { sql } from 'drizzle-orm';
import { date, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { students } from './students';
import { users } from './users';

export const tuitionPlans = pgTable('tuition_plans', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').default('USD').notNull(),
  frequency: text('frequency', { enum: ['monthly', 'annual', 'one_time'] }).notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  slidingScaleNotes: text('sliding_scale_notes'),
  status: text('status').default('active').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeCheckoutSessionId: text('stripe_checkout_session_id'),
  guardianUserId: uuid('guardian_user_id').references(() => users.id),
  // Sibling / family discount — amountCents above is always the final charged
  // amount; baseAmountCents is the sticker rate before the discount was applied.
  baseAmountCents: integer('base_amount_cents'),
  discountType: text('discount_type', { enum: ['percent', 'fixed'] }),
  discountValue: integer('discount_value'),
  discountReason: text('discount_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TuitionPlan = typeof tuitionPlans.$inferSelect;
export type NewTuitionPlan = typeof tuitionPlans.$inferInsert;
