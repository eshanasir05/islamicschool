import { Resend } from 'resend';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export const runtime = 'nodejs';

const { contactSubmissions } = schema;

const inputSchema = z.object({
  schoolName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  email: z.string().email(),
  schoolType: z.enum(['weekend_school', 'quran_tutor', 'full_time_academy', 'other']),
  studentCount: z.enum(['lt_25', '25_100', '100_300', '300_plus']),
  message: z.string().max(2000).optional(),
});

const SCHOOL_TYPE_LABEL: Record<string, string> = {
  weekend_school: 'Weekend school',
  quran_tutor: 'Quran tutor / halaqa',
  full_time_academy: 'Full-time Islamic academy',
  other: 'Other',
};

const COUNT_LABEL: Record<string, string> = {
  lt_25: 'Under 25',
  '25_100': '25 – 100',
  '100_300': '100 – 300',
  '300_plus': '300+',
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }

  const { schoolName, contactName, email, schoolType, studentCount, message } = parsed.data;

  // Step 1: Save to DB first. Lead is never lost even if email fails.
  let savedId: string | undefined;
  try {
    const [row] = await db.insert(contactSubmissions).values({
      schoolName,
      contactName,
      email,
      schoolType,
      studentCount,
      message: message ?? null,
      emailSent: false,
    }).returning({ id: contactSubmissions.id });
    savedId = row?.id;
  } catch (err) {
    console.error('Contact DB save failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again or email us directly.' }, { status: 500 });
  }

  // Step 2: Resend notification — optional. Failure here does not lose the lead.
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const toEmail = process.env.LEADS_TO_EMAIL;

  if (apiKey && fromEmail && toEmail) {
    try {
      const resend = new Resend(apiKey);
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

      await Promise.all([
        resend.emails.send({
          from: fromEmail,
          to: toEmail,
          replyTo: email,
          subject: `Demo request — ${schoolName}`,
          html: `
            <p><strong>New contact request from the Talibly website.</strong></p>
            <table style="border-collapse:collapse;font-size:14px">
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">School</td><td><strong>${schoolName}</strong></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Contact</td><td>${contactName}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Type</td><td>${SCHOOL_TYPE_LABEL[schoolType]}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Students</td><td>${COUNT_LABEL[studentCount]}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Submitted</td><td>${timestamp} UTC</td></tr>
            </table>
            ${message ? `<p style="margin-top:16px"><strong>Message:</strong><br/>${message}</p>` : ''}
            <p style="margin-top:16px;color:#6b7280;font-size:13px">Reply to this email to reach ${contactName}.</p>
          `,
        }),
        resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `We'll be in touch — Talibly`,
          html: `
            <p>Assalamu alaikum ${contactName},</p>
            <p>Thank you for reaching out about Talibly for <strong>${schoolName}</strong>.</p>
            <p>We'll follow up within one business day to walk you through a demo and answer any questions, in sha Allah.</p>
            <p>In the meantime, feel free to reply to this email with anything on your mind.</p>
            <p>Warm regards,<br/>The Talibly Team</p>
          `,
        }),
      ]);

      if (savedId) {
        await db.update(contactSubmissions).set({ emailSent: true }).where(eq(contactSubmissions.id, savedId));
      }
    } catch (err) {
      console.error('Resend notification failed (lead already saved in DB):', err);
    }
  }

  return NextResponse.json({ ok: true });
}
