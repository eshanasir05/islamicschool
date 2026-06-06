import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) return NextResponse.redirect(`${origin}/sign-in?error=no-code`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/sign-in?error=auth-failed`);
  }

  const orgId = process.env.NEXT_PUBLIC_ORG_ID!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/memberships?user_id=eq.${data.user.id}&organization_id=eq.${orgId}&status=eq.active&select=role&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  const memberships: { role: string }[] = await res.json();
  const role = memberships[0]?.role;

  if (!role) return NextResponse.redirect(`${origin}/sign-in?error=no-access`);

  const home = role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/admin';
  return NextResponse.redirect(`${origin}${home}`);
}
