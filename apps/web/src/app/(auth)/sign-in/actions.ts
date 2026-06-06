'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/env';

export async function signInWithMagicLink(email: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  });
  if (error) throw new Error(error.message);
}
