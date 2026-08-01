'use client';

import { Icon } from '@/components/marketing/icon';
import Link from 'next/link';
import { useState } from 'react';

type Tier = {
  name: string;
  blurb: string;
  monthly: number;
  annual: number;
  capacity: string;
  cta: string;
  featured?: boolean;
  tag?: string;
  features: string[];
};

const PRICE_FORMATTER = new Intl.NumberFormat('en-US');

const TIERS: Tier[] = [
  {
    name: 'Quran Tutor',
    blurb: 'For independent tutors and small halaqas.',
    monthly: 15,
    annual: 150,
    capacity: 'Up to 25 active students',
    cta: 'Request pricing',
    features: [
      'All parent app features',
      'Hifz audio recording',
      'Multi-child parent accounts',
      'Tuition tracking tools',
      'Mobile-friendly web app',
      'Guided onboarding',
      'Email support',
    ],
  },
  {
    name: 'Weekend School',
    blurb: 'For Sunday schools, masjid programs, and weekend academies.',
    monthly: 65,
    annual: 650,
    capacity: '26–250 active students',
    cta: 'Request pricing',
    featured: true,
    tag: 'Most schools',
    features: [
      'Everything in Quran Tutor',
      'Unlimited teachers & classes',
      'Principal dashboard',
      'Tuition pipeline & payment tracking',
      'Sibling discounts',
      'Board-ready CSV exports',
      'Self-service roster import',
      'Guided onboarding',
      'Email support',
    ],
  },
  {
    name: 'Full-time Academy',
    blurb: 'For five-day Islamic schools with multiple grade bands.',
    monthly: 199,
    annual: 1990,
    capacity: '251–750 active students',
    cta: 'Request pricing',
    features: [
      'Everything in Weekend School',
      'Expanded reporting workflows',
      'Insights and Board Pack reporting',
      'Self-service roster import',
      'Guided onboarding',
      'Email support',
      'Full enrollment — planned',
      'SSO — planned',
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
              Flat-rate plans selected by school size. No per-student fees, no setup fees, and
              Talibly takes 0% of your school&apos;s tuition.
            </p>

            <fieldset className="pricing-toggle" aria-label="Billing period">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                aria-pressed={!annual}
                className={`pricing-toggle-btn${!annual ? ' is-active' : ''}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                aria-pressed={annual}
                className={`pricing-toggle-btn${annual ? ' is-active' : ''}`}
              >
                Annual <span className="pricing-toggle-save">2 months free</span>
              </button>
            </fieldset>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="tiers">
            {TIERS.map((tier) => (
              <div className={`tier ${tier.featured ? 'featured' : ''}`} key={tier.name}>
                {tier.tag && <span className="tier-tag">{tier.tag}</span>}
                <h3>{tier.name}</h3>
                <p className="tier-blurb">{tier.blurb}</p>
                <div className="price">
                  <span className="amt">
                    {'$'}
                    {PRICE_FORMATTER.format(annual ? tier.annual : tier.monthly)}
                  </span>
                  <span className="per">/ {annual ? 'year' : 'month'}</span>
                </div>
                <div className="price-note">
                  {tier.capacity} · Flat rate
                  {annual ? ' · Two months free' : ''}
                </div>
                <ul>
                  {tier.features.map((feature) => (
                    <li key={feature}>
                      <Icon name="check" size={14} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="tier-cta" style={{ flexDirection: 'column', gap: 8 }}>
                  <Link
                    className={`btn ${tier.featured ? 'btn-accent' : 'btn-primary'}`}
                    href="/contact"
                  >
                    {tier.cta}
                    <Icon name="arrow" size={14} />
                  </Link>
                  <span
                    style={{
                      fontSize: 12,
                      color: tier.featured ? 'rgba(255,255,255,0.55)' : 'var(--subtle)',
                      textAlign: 'center',
                    }}
                  >
                    Pricing inquiry only · No online purchase
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="tier"
            style={{
              marginTop: 20,
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 24,
            }}
          >
            <div style={{ flex: '1 1 320px' }}>
              <h3>Enterprise</h3>
              <p className="tier-blurb" style={{ marginBottom: 0 }}>
                For schools with 751+ active students or multiple campuses.
              </p>
            </div>
            <div style={{ flex: '1 1 240px' }}>
              <div className="price">
                <span className="amt" style={{ fontSize: 32 }}>
                  Contact us
                </span>
              </div>
              <div className="price-note" style={{ marginBottom: 0 }}>
                Custom flat-rate plan · Priority support
              </div>
            </div>
            <div className="tier-cta" style={{ width: 'auto', flex: '1 1 200px' }}>
              <Link className="btn btn-primary" href="/contact">
                Contact us
                <Icon name="arrow" size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
