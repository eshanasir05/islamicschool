import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

async function roleRedirect(userId: string, origin: string): Promise<NextResponse> {
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/memberships?user_id=eq.${userId}&organization_id=eq.${orgId}&status=eq.active&select=role&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  const memberships: { role: string }[] = await res.json();
  const role = memberships[0]?.role;

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/sign-in`);
  return roleRedirect(user.id, origin);
}
