'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/env';

export async function sendPasswordReset(email: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/reset`,
  });
  if (error) return { error: error.message };
  return {};
}
