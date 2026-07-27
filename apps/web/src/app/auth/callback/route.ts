import { env } from '@/env';
import { db, schema } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

async function roleRedirect(userId: string, origin: string): Promise<NextResponse> {
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(schema.memberships.userId, userId),
      eq(schema.memberships.organizationId, env.NEXT_PUBLIC_ORG_ID),
      eq(schema.memberships.status, 'active'),
    ),
    columns: { role: true },
  });
  const role = membership?.role;

  if (!role) return NextResponse.redirect(`${origin}/sign-in?error=no-access`);
  const home = role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/admin';
  return NextResponse.redirect(`${origin}${home}`);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const supabase = await createSupabaseServerClient();

  if (code) {
    // Magic-link flow: exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/sign-in?error=auth-failed`);
    }
    return roleRedirect(data.user.id, origin);
  }

  // Password flow: session already set by the client action
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/sign-in`);
  return roleRedirect(user.id, origin);
}
