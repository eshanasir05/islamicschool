'use client';

import { useState } from 'react';
import { signInWithPassword, signInWithMagicLink } from './actions';
import { TaliblyLogo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

type Mode = 'password' | 'magic';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<Mode>('password');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const noAccess = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('error') === 'no-access';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'password') {
      const result = await signInWithPassword(email, password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      window.location.href = '/auth/callback';
    } else {
      const result = await signInWithMagicLink(email);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="sign-in-page">
        <div className="sign-in-card">
          <div className="sign-in-logo"><TaliblyLogo iconSize={24} /></div>
          <div className="sign-in-sent">
            <h2>Check your email</h2>
            <p>We sent a sign-in link to <strong>{email}</strong>. Click it to continue.</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '12px 0' }}>
              Don&apos;t see it? Check your spam folder. Magic link delivery requires custom SMTP configuration in Supabase — for the demo, use password sign-in instead.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" className="btn btn-accent" onClick={() => { setSent(false); setMode('password'); }}>
                Sign in with password instead
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setSent(false); setEmail(''); }}>
                Use a different email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sign-in-page">
      <ThemeToggle compact className="auth-theme-toggle" />
      <div className="sign-in-card">
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-muted)', marginBottom: 16, textDecoration: 'none' }}>
          ← Back to home
        </a>
        <div className="sign-in-logo"><TaliblyLogo iconSize={24} /></div>
        <h1 className="sign-in-title">Sign in to Talibly</h1>

        {noAccess && (
          <p className="sign-in-error">
            Your email isn't linked to a Talibly account. Contact your school administrator.
          </p>
        )}

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
          {mode === 'password' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="sign-in-input"
              autoComplete="current-password"
            />
          )}
          <button type="submit" disabled={loading} className="btn btn-accent sign-in-btn">
            {loading ? 'Signing in…' : mode === 'password' ? 'Sign in' : 'Send magic link'}
          </button>
        </form>
        {mode === 'password' && (
          <a href="/forgot-password" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
            Forgot your password?
          </a>
        )}

        {error && <p className="sign-in-error">{error}</p>}

        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: 12, fontSize: 13, width: '100%' }}
          onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError(''); }}
        >
          {mode === 'password' ? 'Sign in with magic link instead' : 'Sign in with password instead'}
        </button>
        {mode === 'magic' && (
          <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>
            Requires SMTP configuration — password auth is recommended for the demo.
          </p>
        )}

        {process.env.NEXT_PUBLIC_SHOW_DEMO_LINK === 'true' && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            Evaluating Talibly?{' '}
            <a href="/demo" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              View demo credentials →
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
