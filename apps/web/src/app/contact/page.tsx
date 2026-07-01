'use client';

import { useState } from 'react';
import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Icon } from '@/components/marketing/icon';
import type { Metadata } from 'next';

type State = 'idle' | 'loading' | 'success' | 'error';

const INPUT = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontSize: 14,
  background: 'var(--surface)',
  color: 'var(--fg)',
  boxSizing: 'border-box' as const,
  outline: 'none',
};

const LABEL = {
  display: 'block' as const,
  fontSize: 13,
  fontWeight: 600 as const,
  color: 'var(--fg)',
  marginBottom: 6,
};

export default function ContactPage() {
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('loading');
    setErrorMsg('');

    const fd = new FormData(e.currentTarget);
    const body = {
      schoolName:   fd.get('schoolName'),
      contactName:  fd.get('contactName'),
      email:        fd.get('email'),
      schoolType:   fd.get('schoolType'),
      studentCount: fd.get('studentCount'),
      message:      fd.get('message') || undefined,
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    <>
      <SiteNav />
      <main style={{ minHeight: '80vh', padding: '80px 0 120px' }}>
        <div className="container" style={{ maxWidth: 680 }}>

          <span className="eyebrow" style={{ marginBottom: 12, display: 'inline-flex' }}>
            <span className="dot" />
            Get in touch
          </span>
          <h1 style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.15, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Book a demo for your school.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Tell us a little about your school and we'll reach out within one business day to walk you through a live demo, in sha Allah. No pressure, no sales script.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', marginBottom: 40 }}>
            {['Your details stay private', 'Reply within 1 business day', 'No sales pressure'].map((t) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--accent)', display: 'inline-flex' }}><Icon name="check" size={14} /></span>
                {t}
              </span>
            ))}
          </div>

          {state === 'success' ? (
            <div style={{ padding: '32px 28px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#166534', marginBottom: 8 }}>JazakAllah khayran.</h2>
              <p style={{ fontSize: 15, color: '#166534' }}>
                We received your request and will be in touch within one business day. Check your inbox for a confirmation.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={LABEL}>School name <span style={{ color: 'var(--accent)' }}>*</span></label>
                  <input name="schoolName" type="text" required placeholder="Masjid Al-Noor Sunday School" style={INPUT} />
                </div>
                <div>
                  <label style={LABEL}>Your name <span style={{ color: 'var(--accent)' }}>*</span></label>
                  <input name="contactName" type="text" required placeholder="Imam Khalid" style={INPUT} />
                </div>
              </div>

              <div>
                <label style={LABEL}>Email address <span style={{ color: 'var(--accent)' }}>*</span></label>
                <input name="email" type="email" required placeholder="principal@yourschool.org" style={INPUT} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={LABEL}>School type <span style={{ color: 'var(--accent)' }}>*</span></label>
                  <select name="schoolType" required defaultValue="" style={{ ...INPUT, cursor: 'pointer' }}>
                    <option value="" disabled>Select one…</option>
                    <option value="weekend_school">Weekend school</option>
                    <option value="quran_tutor">Quran tutor / halaqa</option>
                    <option value="full_time_academy">Full-time Islamic academy</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Estimated students <span style={{ color: 'var(--accent)' }}>*</span></label>
                  <select name="studentCount" required defaultValue="" style={{ ...INPUT, cursor: 'pointer' }}>
                    <option value="" disabled>Select one…</option>
                    <option value="lt_25">Under 25</option>
                    <option value="25_100">25 – 100</option>
                    <option value="100_300">100 – 300</option>
                    <option value="300_plus">300+</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={LABEL}>Message <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  name="message"
                  rows={4}
                  placeholder="Any context that would help — current tools you're using, specific questions, timing, etc."
                  style={{ ...INPUT, resize: 'vertical' as const, lineHeight: 1.5, fontFamily: 'inherit' }}
                />
              </div>

              {state === 'error' && (
                <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}>{errorMsg}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  type="submit"
                  disabled={state === 'loading'}
                  className="btn btn-accent"
                  style={{ padding: '12px 28px', fontSize: 15 }}
                >
                  {state === 'loading' ? 'Sending…' : 'Send request'}
                  {state !== 'loading' && <Icon name="arrow" size={14} />}
                </button>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>We reply within one business day.</span>
              </div>

              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                By submitting this form you agree to our{' '}
                <a href="/privacy" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>Privacy Policy</a>.
                We will never share your information with third parties.
              </p>
            </form>
          )}

          <div style={{ marginTop: 64, paddingTop: 40, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6 }}>Email</div>
              <a href="mailto:info@talibly.com" style={{ fontSize: 14, color: 'var(--accent)', textDecoration: 'none' }}>info@talibly.com</a>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6 }}>Response time</div>
              <p style={{ fontSize: 14, margin: 0, color: 'var(--fg)' }}>Within 1 business day</p>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6 }}>Based in</div>
              <p style={{ fontSize: 14, margin: 0, color: 'var(--fg)' }}>North America</p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
