'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { TaliblyLogo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    setDone(true);
  }

  return (
    <div className="sign-in-page">
      <ThemeToggle compact className="auth-theme-toggle" />
      <div className="sign-in-card">
        <div className="sign-in-logo"><TaliblyLogo iconSize={24} /></div>

        {done ? (
          <div className="sign-in-sent">
            <h2>Password updated</h2>
            <p>Your password has been changed. You can now sign in with your new password.</p>
            <a href="/sign-in" className="btn btn-accent" style={{ marginTop: 16, display: 'inline-block' }}>
              Sign in
            </a>
          </div>
        ) : (
          <>
            <h1 className="sign-in-title">Set a new password</h1>
            <form onSubmit={handleSubmit} className="sign-in-form">
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="sign-in-input"
                autoComplete="new-password"
                autoFocus
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="sign-in-input"
                autoComplete="new-password"
              />
              <button type="submit" disabled={loading} className="btn btn-accent sign-in-btn">
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </form>
            {error && <p className="sign-in-error">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
