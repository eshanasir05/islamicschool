import 'server-only';

import { env } from '@/env';
import { db, schema } from '@/lib/db';
import { escapeHtml } from '@/lib/html';
import { createNotification } from '@/lib/notifications';
import { and, eq } from 'drizzle-orm';
import { Resend } from 'resend';

export async function runTuitionReminders(
  orgId: string,
  opts: { planId?: string; throttleDays?: number } = {},
) {
  const cutoff = opts.throttleDays
    ? new Date(Date.now() - opts.throttleDays * 24 * 60 * 60 * 1000)
    : null;

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

  const eligible = cutoff
    ? plans.filter((plan) => !plan.lastReminderSentAt || new Date(plan.lastReminderSentAt) < cutoff)
    : plans;
  if (eligible.length === 0) return { sent: 0 };

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const resend = apiKey ? new Resend(apiKey) : null;
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  let sent = 0;
  for (const plan of eligible) {
    if (!plan.guardianUserId) continue;
    const studentName = plan.student?.fullName ?? 'your child';
    const safeStudentName = escapeHtml(studentName);
    const safeGuardianName = escapeHtml(plan.guardian?.fullName ?? 'dear parent');
    const subjectStudentName = studentName.replace(/[\r\n]+/g, ' ');
    const amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: plan.currency,
    }).format(plan.amountCents / 100);

    await createNotification({
      organizationId: orgId,
      userId: plan.guardianUserId,
      type: 'payment_failed',
      title: 'Tuition payment reminder',
      body: `${studentName}'s tuition payment of ${amount} is past due. Please update your payment method to avoid interruption.`,
      link: `/parent/${plan.studentId}`,
    });

    if (resend && plan.guardian?.email) {
      await resend.emails.send({
        from: fromEmail,
        to: plan.guardian.email,
        subject: `Tuition payment reminder — ${subjectStudentName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
            <p style="font-size:16px">Assalamu alaykum, ${safeGuardianName},</p>
            <p>This is a friendly reminder that <strong>${safeStudentName}</strong>'s tuition payment of <strong>${amount}</strong> is past due.</p>
            <p>Please update your payment method to keep billing active:</p>
            <p><a href="${appUrl}/parent/${plan.studentId}" style="color:#7c5cbf">Update billing →</a></p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="font-size:13px;color:#888">JazakAllah khair — Talibly</p>
          </div>
        `,
      });
    }

    await db
      .update(schema.tuitionPlans)
      .set({ lastReminderSentAt: new Date() })
      .where(eq(schema.tuitionPlans.id, plan.id));
    sent++;
  }

  return { sent };
}
