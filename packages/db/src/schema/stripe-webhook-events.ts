import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Durable Stripe event ledger. The webhook inserts the event inside the same
 * database transaction as its business effects, so a retry cannot apply the
 * same payment transition twice.
 */
export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  stripeEventId: text('stripe_event_id').primaryKey(),
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});

export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type NewStripeWebhookEvent = typeof stripeWebhookEvents.$inferInsert;
