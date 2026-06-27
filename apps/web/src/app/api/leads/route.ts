// TODO: replace RESEND_FROM_EMAIL=onboarding@resend.dev with a verified domain before production
import { Resend } from 'resend';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  const { email } = parsed.data;
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const toEmail = process.env.LEADS_TO_EMAIL;

  if (!apiKey || !fromEmail || !toEmail) {
    return NextResponse.json({ error: 'Email service not configured.' }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const [internal, confirmation] = await Promise.all([
    resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject: `New demo request — ${email}`,
      html: `
        <p>A new lead just submitted their email through the Talibly website.</p>
        <p><strong>Email:</strong> ${email}<br/>
        <strong>Time:</strong> ${timestamp} UTC</p>
        <p>Reply directly to this email to reach them, or follow up within 24 hours while they're warm.</p>
      `,
    }),
    resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `We received your request — Talibly`,
      html: `
        <p>Assalamu alaikum,</p>
        <p>Thank you for your interest in Talibly — we're glad your school is looking to simplify its weekend mornings!</p>
        <p>Our team will reach out within a business day to walk you through everything, in sha Allah.</p>
        <p>If you have any questions in the meantime, just reply to this email.</p>
        <p>Warm regards,<br/>The Talibly Team</p>
      `,
    }),
  ]);

  if (internal.error || confirmation.error) {
    console.error('Resend error:', internal.error ?? confirmation.error);
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
