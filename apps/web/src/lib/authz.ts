export type AppRole = 'admin' | 'principal' | 'teacher' | 'parent' | 'student';

export const PUBLIC_PATHS = [
  '/',
  '/for-parents',
  '/for-teachers',
  '/for-principals',
  '/pricing',
  '/sign-in',
  '/auth/callback',
  '/auth/reset',
  '/api',
  '/forgot-password',
  '/update-password',
  '/contact',
  '/privacy',
  '/terms',
  '/security',
  '/demo',
  '/quick-start',
  '/known-limitations',
] as const;

export const PROTECTED_PREFIXES = ['/teacher', '/parent', '/admin'] as const;

export function isPublicAppPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  );
}

export function isProtectedAppPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function canRoleAccessPath(role: string, pathname: string): boolean {
  if (pathname.startsWith('/teacher')) return role === 'teacher';
  if (pathname.startsWith('/parent')) return role === 'parent';
  if (pathname.startsWith('/admin')) return role === 'admin' || role === 'principal';
  return true;
}

export function roleHome(role: string): '/admin' | '/teacher' | '/parent' {
  if (role === 'teacher') return '/teacher';
  if (role === 'parent') return '/parent';
  return '/admin';
}

export function isAdminRole(role: string): role is 'admin' | 'principal' {
  return role === 'admin' || role === 'principal';
}
