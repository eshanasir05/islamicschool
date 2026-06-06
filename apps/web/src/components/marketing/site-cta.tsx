'use client';

import { useState } from 'react';
import { Icon } from './icon';

type Props = {
  title?: string;
  body?: string;
  cta?: string;
};

export function SiteCTA({
  title = 'Bring Talibly to your school.',
  body = "Weekend school, full-time academy, or one-on-one tutor. We'll get your roster imported and your first class wrapped this week.",
  cta = 'Book a demo',
}: Props) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="cta" id="demo">
      <div className="container">
        <div className="cta-card">
          <h2>{title}</h2>
          <p>{body}</p>
          {!submitted ? (
            <form
              className="cta-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.includes('@')) setSubmitted(true);
              }}
            >
              <input
                type="email"
                placeholder="you@your-school.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-accent">
                {cta}
                <Icon name="arrow" size={14} />
              </button>
            </form>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                color: '#a7f3d0',
                position: 'relative',
              }}
            >
              <Icon name="check" size={18} />
              <span>JazakAllah khair. We&apos;ll be in touch within a day.</span>
            </div>
          )}
          <p className="cta-fine">No card. No setup fees. Onboarded in a weekend.</p>
        </div>
      </div>
    </section>
  );
}
