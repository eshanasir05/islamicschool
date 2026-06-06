'use client';

import { useState } from 'react';
import { signInWithPassword, signInWithMagicLink } from './actions';

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
          <div className="sign-in-logo"><span className="mark">T</span><span>talibly</span></div>
          <div className="sign-in-sent">
            <div className="sign-in-sent-icon">✉️</div>
            <h2>Check your email</h2>
            <p>We sent a sign-in link to <strong>{email}</strong>. Click it to continue.</p>
            <button type="button" className="btn btn-ghost" onClick={() => { setSent(false); setEmail(''); }}>
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sign-in-page">
      <div className="sign-in-card">
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-muted)', marginBottom: 16, textDecoration: 'none' }}>
          ← Back to home
        </a>
        <div className="sign-in-logo"><span className="mark">T</span><span>talibly</span></div>
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

        {error && <p className="sign-in-error">{error}</p>}

        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: 12, fontSize: 13, width: '100%' }}
          onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError(''); }}
        >
          {mode === 'password' ? 'Sign in with magic link instead' : 'Sign in with password instead'}
        </button>

        <div className="sign-in-demo-hint">
          <strong>Demo logins:</strong><br />
          amina@talibly.dev · idris@talibly.dev · sarah@talibly.dev<br />
          omar@talibly.dev · khalid@talibly.dev<br />
          Password: <code>demo1234</code>
        </div>
      </div>
    </div>
  );
}
