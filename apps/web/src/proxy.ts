import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/for-parents', '/for-teachers', '/for-principals', '/pricing', '/sign-in', '/auth/callback', '/auth/reset', '/api', '/forgot-password', '/update-password', '/contact', '/privacy', '/terms', '/security', '/demo', '/quick-start', '/known-limitations'];
const PROTECTED_PREFIXES = ['/teacher', '/parent', '/admin'];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    if (isPublic(pathname)) return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = '/sign-in';
    return NextResponse.redirect(signIn);
  }

  // Fetch role from DB via service role (avoid RLS issues)
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!;

  // Inline role lookup using Supabase REST (avoids importing Drizzle in edge middleware)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/memberships?user_id=eq.${user.id}&organization_id=eq.${orgId}&status=eq.active&select=role&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  const memberships: { role: string }[] = await res.json();
  const role = memberships[0]?.role;

  if (!role) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = '/sign-in';
    signIn.searchParams.set('error', 'no-access');
    return NextResponse.redirect(signIn);
  }

  // Enforce role ↔ path
  if (pathname.startsWith('/teacher') && role !== 'teacher') {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }
  if (pathname.startsWith('/parent') && role !== 'parent') {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }
  if (pathname.startsWith('/admin') && role !== 'principal' && role !== 'admin') {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  return response;
}

function roleHome(role: string) {
  if (role === 'teacher') return '/teacher';
  if (role === 'parent') return '/parent';
  return '/admin';
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
