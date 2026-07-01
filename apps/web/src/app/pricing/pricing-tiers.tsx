'use client';

import { Icon } from '@/components/marketing/icon';
import Link from 'next/link';
import { useState } from 'react';

type Tier = {
  name: string;
  blurb: string;
  monthly: number;
  annualMonthly: number;
  perNote: string;
  cta: string;
  featured?: boolean;
  tag?: string;
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: 'Quran Tutor',
    blurb: 'For independent tutors and small halaqas with up to 25 students.',
    monthly: 19,
    annualMonthly: 15,
    perNote: 'Up to 25 students',
    cta: 'Book a demo',
    features: [
      'All parent app features',
      'Hifz audio recording',
      'Multi-child parent accounts',
      'Stripe tuition billing',
      'Mobile-friendly web app',
      'Email support',
    ],
  },
  {
    name: 'Weekend School',
    blurb: 'For Sunday schools, masjid programs, and weekend academies with 25 to 250 students.',
    monthly: 79,
    annualMonthly: 65,
    perNote: '+$1.50 / student / month',
    cta: 'Book a demo',
    featured: true,
    tag: 'Most schools',
    features: [
      'Everything in Quran Tutor',
      'Unlimited teachers & classes',
      'Principal dashboard',
      'Tuition pipeline & autopay',
      'Sibling discounts (coming soon)',
      'Board-ready CSV exports',
      'Roster import & onboarding',
      'Priority chat support',
    ],
  },
  {
    name: 'Full-time Academy',
    blurb: 'For five-day Islamic schools with 100+ students and multiple grade bands.',
    monthly: 249,
    annualMonthly: 199,
    perNote: '+$1 / student / month',
    cta: 'Book a demo',
    features: [
      'Everything in Weekend School',
      'Volume tuition pricing',
      'Custom enrollment setup',
      'Dedicated onboarding manager',
      'Single sign-on (SSO)',
      'Quarterly business reviews',
      'SLA-backed uptime',
    ],
  },
];

export function PricingHeroAndTiers() {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
            <span className="eyebrow">
              <span className="dot" />
              Pricing
            </span>
            <h1 style={{ textAlign: 'center' }}>
              Honest pricing for <span className="serif">small ummah</span> budgets.
            </h1>
            <p className="lede" style={{ textAlign: 'center', margin: '0 auto 32px' }}>
              Flat monthly fee. Per-student pricing that scales with you. No setup, no contracts, no
              per-feature gotchas. Every tier includes every feature.
            </p>

            <div
              style={{
                display: 'inline-flex',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 999,
                padding: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setAnnual(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  border: 'none',
                  background: !annual ? 'var(--fg)' : 'transparent',
                  color: !annual ? '#fafaf9' : 'var(--muted)',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  border: 'none',
                  background: annual ? 'var(--fg)' : 'transparent',
                  color: annual ? '#fafaf9' : 'var(--muted)',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Annual{' '}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    background: annual ? 'rgba(52, 211, 153, 0.25)' : 'var(--accent-soft)',
                    color: annual ? '#34d399' : 'var(--accent-700)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  −2 MO
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="tiers">
            {TIERS.map((t) => (
              <div className={`tier ${t.featured ? 'featured' : ''}`} key={t.name}>
                {t.tag && <span className="tier-tag">{t.tag}</span>}
                <h3>{t.name}</h3>
                <p className="tier-blurb">{t.blurb}</p>
                <div className="price">
                  <span className="amt">${annual ? t.annualMonthly : t.monthly}</span>
                  <span className="per">/ month</span>
                </div>
                <div className="price-note">
                  {t.perNote} · {annual ? 'billed annually' : 'billed monthly'}
                </div>
                <ul>
                  {t.features.map((f) => (
                    <li key={f}>
                      <Icon name="check" size={14} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="tier-cta" style={{ flexDirection: 'column', gap: 8 }}>
                  <Link className={`btn ${t.featured ? 'btn-accent' : 'btn-primary'}`} href="/contact">
                    {t.cta}
                    <Icon name="arrow" size={14} />
                  </Link>
                  <span style={{ fontSize: 12, color: t.featured ? 'rgba(255,255,255,0.55)' : 'var(--subtle)', textAlign: 'center' }}>
                    No setup fee · Cancel anytime
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
