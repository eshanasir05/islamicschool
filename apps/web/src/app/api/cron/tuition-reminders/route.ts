import { sendTuitionRemindersThrottled } from '@/app/(admin)/actions';
import { env } from '@/env';
import { type NextRequest, NextResponse } from 'next/server';

// Vercel Cron hits this daily (see vercel.json). Reminds past-due families
// at most once every 7 days each, so a family isn't emailed every day their
// plan stays past due.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sent } = await sendTuitionRemindersThrottled(env.NEXT_PUBLIC_ORG_ID, 7);
  return NextResponse.json({ ok: true, sent });
}
