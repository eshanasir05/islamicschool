'use client';

import { useState } from 'react';
import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Icon } from '@/components/marketing/icon';
import type { Metadata } from 'next';

type State = 'idle' | 'loading' | 'success' | 'error';

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
          <h1 className="marketing-h1" style={{ lineHeight: 1.15 }}>
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
            <div className="banner banner-success" style={{ padding: '32px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>JazakAllah khayran.</h2>
              <p style={{ fontSize: 15 }}>
                We received your request and will be in touch within one business day. Check your inbox for a confirmation.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div className="form-grid">
                <div className="field">
                  <label className="field-label">School name <span style={{ color: 'var(--accent)' }}>*</span></label>
                  <input name="schoolName" type="text" required placeholder="Masjid Al-Noor Sunday School" className="form-input" />
                </div>
                <div className="field">
                  <label className="field-label">Your name <span style={{ color: 'var(--accent)' }}>*</span></label>
                  <input name="contactName" type="text" required placeholder="Imam Khalid" className="form-input" />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Email address <span style={{ color: 'var(--accent)' }}>*</span></label>
                <input name="email" type="email" required placeholder="principal@yourschool.org" className="form-input" />
              </div>

              <div className="form-grid">
                <div className="field">
                  <label className="field-label">School type <span style={{ color: 'var(--accent)' }}>*</span></label>
                  <select name="schoolType" required defaultValue="" className="form-select">
                    <option value="" disabled>Select one…</option>
                    <option value="weekend_school">Weekend school</option>
                    <option value="quran_tutor">Quran tutor / halaqa</option>
                    <option value="full_time_academy">Full-time Islamic academy</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Estimated students <span style={{ color: 'var(--accent)' }}>*</span></label>
                  <select name="studentCount" required defaultValue="" className="form-select">
                    <option value="" disabled>Select one…</option>
                    <option value="lt_25">Under 25</option>
                    <option value="25_100">25 – 100</option>
                    <option value="100_300">100 – 300</option>
                    <option value="300_plus">300+</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Message <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  name="message"
                  rows={4}
                  placeholder="Any context that would help — current tools you're using, specific questions, timing, etc."
                  className="form-textarea"
                />
              </div>

              {state === 'error' && (
                <p className="field-error" style={{ margin: 0 }}>{errorMsg}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  type="submit"
                  disabled={state === 'loading'}
                  className="btn btn-accent"
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

          <div className="form-grid-3" style={{ marginTop: 64, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
            <div>
              <div className="text-label" style={{ marginBottom: 6 }}>Email</div>
              <a href="mailto:info@talibly.com" style={{ fontSize: 14, color: 'var(--accent)', textDecoration: 'none' }}>info@talibly.com</a>
            </div>
            <div>
              <div className="text-label" style={{ marginBottom: 6 }}>Response time</div>
              <p style={{ fontSize: 14, margin: 0, color: 'var(--fg)' }}>Within 1 business day</p>
            </div>
            <div>
              <div className="text-label" style={{ marginBottom: 6 }}>Based in</div>
              <p style={{ fontSize: 14, margin: 0, color: 'var(--fg)' }}>North America</p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
