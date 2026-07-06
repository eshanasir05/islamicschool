'use client';

import { useState } from 'react';
import { sendPasswordReset } from './actions';
import { TaliblyLogo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await sendPasswordReset(email);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="sign-in-page">
      <ThemeToggle compact className="auth-theme-toggle" />
      <div className="sign-in-card">
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-muted)', marginBottom: 16, textDecoration: 'none' }}>
          ← Back to home
        </a>
        <div className="sign-in-logo"><TaliblyLogo iconSize={24} /></div>

        {sent ? (
          <div className="sign-in-sent">
            <h2>Check your email</h2>
            <p>We sent a password reset link to <strong>{email}</strong>. Click it to set a new password.</p>
            <a href="/sign-in" className="btn btn-ghost" style={{ marginTop: 16, display: 'inline-block' }}>
              Back to sign in
            </a>
          </div>
        ) : (
          <>
            <h1 className="sign-in-title">Reset your password</h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="sign-in-form">
              <input
                type="email"
                placeholder="you@school.org"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="sign-in-input"
                autoComplete="email"
                autoFocus
              />
              <button type="submit" disabled={loading} className="btn btn-accent sign-in-btn">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            {error === 'rate_limit' && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--warn-bg)', border: '1px solid var(--warn-border)', fontSize: 13, color: 'var(--warn-fg)' }}>
                <strong>Too many requests.</strong> Supabase limits password reset emails on the free tier. Please wait a minute and try again, or use the <a href="/sign-in" style={{ color: 'var(--warn-fg)', fontWeight: 600 }}>demo credentials</a> on the sign-in page.
              </div>
            )}
            {error === 'send_failed' && (
              <p className="sign-in-error">Couldn't send the reset email. Please try again.</p>
            )}
            <a href="/sign-in" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
              Back to sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
