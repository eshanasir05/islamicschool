'use client';

import { useState } from 'react';
import { signInWithMagicLink } from './actions';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithMagicLink(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sign-in-page">
      <div className="sign-in-card">
        <div className="sign-in-logo">
          <span className="mark">T</span>
          <span>talibly</span>
        </div>

        {!sent ? (
          <>
            <h1 className="sign-in-title">Sign in to Talibly</h1>
            <p className="sign-in-lede">
              Enter your school email and we'll send you a sign-in link. No password needed.
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
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
            {error && <p className="sign-in-error">{error}</p>}
            {new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('error') === 'no-access' && (
              <p className="sign-in-error">
                Your email isn't linked to a Talibly account. Contact your school administrator.
              </p>
            )}
          </>
        ) : (
          <div className="sign-in-sent">
            <div className="sign-in-sent-icon">✉️</div>
            <h2>Check your email</h2>
            <p>
              We sent a sign-in link to <strong>{email}</strong>.
              Click it to continue — the link expires in 1 hour.
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => { setSent(false); setEmail(''); }}
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
