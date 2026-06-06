'use client';

import { useState } from 'react';
import { Icon } from './icon';

type Props = {
  title?: string;
  body?: string;
  cta?: string;
};

type State = 'idle' | 'loading' | 'success' | 'error';

export function SiteCTA({
  title = 'Bring Talibly to your school.',
  body = "Weekend school, full-time academy, or one-on-one tutor. We'll get your roster imported and your first class wrapped this week.",
  cta = 'Book a demo',
}: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;
    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setState('error');
      } else {
        setState('success');
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setState('error');
    }
  }

  return (
    <section className="cta" id="demo">
      <div className="container">
        <div className="cta-card">
          <h2>{title}</h2>
          <p>{body}</p>

          {state === 'success' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#a7f3d0' }}>
              <Icon name="check" size={18} />
              <span>JazakAllah khair. We&apos;ll be in touch within a day.</span>
            </div>
          ) : (
            <>
              <form className="cta-form" onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="you@your-school.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={state === 'loading'}
                />
                <button type="submit" className="btn btn-accent" disabled={state === 'loading'}>
                  {state === 'loading' ? 'Sending…' : cta}
                  {state !== 'loading' && <Icon name="arrow" size={14} />}
                </button>
              </form>
              {state === 'error' && (
                <p style={{ marginTop: 8, fontSize: 13, color: '#fca5a5' }}>{errorMsg}</p>
              )}
            </>
          )}

          <p className="cta-fine">No card. No setup fees. Onboarded in a weekend.</p>
        </div>
      </div>
    </section>
  );
}
