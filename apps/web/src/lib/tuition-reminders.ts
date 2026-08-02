import 'server-only';

import { env } from '@/env';
import { db, schema } from '@/lib/db';
import { escapeHtml } from '@/lib/html';
import { isTuitionReminderDue, tuitionReminderCutoff } from '@/lib/tuition-reminder-policy';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { Resend } from 'resend';

export async function runTuitionReminders(
  orgId: string,
  opts: { planId?: string; throttleDays?: number; now?: Date } = {},
) {
  const now = opts.now ?? new Date();
  const plans = await db.query.tuitionPlans.findMany({
    where: opts.planId
      ? and(
          eq(schema.tuitionPlans.id, opts.planId),
          eq(schema.tuitionPlans.organizationId, orgId),
          eq(schema.tuitionPlans.status, 'past_due'),
        )
      : and(
          eq(schema.tuitionPlans.organizationId, orgId),
          eq(schema.tuitionPlans.status, 'past_due'),
        ),
    with: {
      student: { columns: { fullName: true } },
      guardian: { columns: { fullName: true, email: true } },
    },
  });

  const eligible = opts.throttleDays
    ? plans.filter((plan) => isTuitionReminderDue(plan.lastReminderSentAt, now, opts.throttleDays!))
    : plans;
  if (eligible.length === 0) return { sent: 0, emailSent: 0 };

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const resend = apiKey ? new Resend(apiKey) : null;
  let sent = 0;
  let emailSent = 0;

  for (const plan of eligible) {
    if (!plan.guardianUserId) continue;

    const studentName = plan.student?.fullName ?? 'your child';
    const amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: plan.currency,
    }).format(plan.amountCents / 100);

    const claimed = await db.transaction(async (transaction) => {
      const throttleCondition = opts.throttleDays
        ? or(
            isNull(schema.tuitionPlans.lastReminderSentAt),
            lt(
              schema.tuitionPlans.lastReminderSentAt,
              tuitionReminderCutoff(now, opts.throttleDays),
            ),
          )
        : undefined;
      const [updatedPlan] = await transaction
        .update(schema.tuitionPlans)
        .set({ lastReminderSentAt: now })
        .where(
          and(
            eq(schema.tuitionPlans.id, plan.id),
            eq(schema.tuitionPlans.organizationId, orgId),
            eq(schema.tuitionPlans.status, 'past_due'),
            throttleCondition,
          ),
        )
        .returning({ id: schema.tuitionPlans.id });

      if (!updatedPlan) return false;

      await transaction.insert(schema.notifications).values({
        organizationId: orgId,
        userId: plan.guardianUserId!,
        type: 'payment_failed',
        title: 'Tuition payment reminder',
        body: `${studentName}'s tuition payment of ${amount} is past due. Please update your payment method to avoid interruption.`,
        link: `/parent/${plan.studentId}`,
      });
      return true;
    });

    if (!claimed) continue;
    sent++;

    if (resend && plan.guardian?.email) {
      const safeStudentName = escapeHtml(studentName);
      const safeGuardianName = escapeHtml(plan.guardian.fullName ?? 'dear parent');
      const subjectStudentName = studentName.replace(/[\r\n]+/g, ' ');
      const result = await resend.emails.send({
        from: fromEmail,
        to: plan.guardian.email,
        subject: `Tuition payment reminder — ${subjectStudentName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
            <p style="font-size:16px">Assalamu alaykum, ${safeGuardianName},</p>
            <p>This is a friendly reminder that <strong>${safeStudentName}</strong>'s tuition payment of <strong>${amount}</strong> is past due.</p>
            <p>Please update your payment method to keep billing active:</p>
            <p><a href="${env.NEXT_PUBLIC_APP_URL}/parent/${plan.studentId}" style="color:#7c5cbf">Update billing →</a></p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="font-size:13px;color:#888">JazakAllah khair — Talibly</p>
          </div>
        `,
      });
      if (result.error) {
        console.error('Tuition reminder email failed:', result.error.name);
      } else {
        emailSent++;
      }
    }
  }

  return { sent, emailSent };
}
