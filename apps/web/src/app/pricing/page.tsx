import { Icon } from '@/components/marketing/icon';
import { SiteCTA } from '@/components/marketing/site-cta';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteNav } from '@/components/marketing/site-nav';
import type { Metadata } from 'next';
import { Fragment } from 'react';
import { PricingHeroAndTiers } from './pricing-tiers';

export const metadata: Metadata = {
  title: 'Talibly · Pricing',
  description:
    'Flat monthly fee. Per-student pricing. No setup, no contracts, no per-feature gotchas.',
};

const SECTIONS: { heading: string; rows: [string, boolean, boolean, boolean][] }[] = [
  {
    heading: 'For parents',
    rows: [
      ['Multi-child feed', true, true, true],
      ['Hifz audio replay', true, true, true],
      ['Parent feed updates', true, true, true],
      ['Autopay tuition', true, true, true],
    ],
  },
  {
    heading: 'For teachers',
    rows: [
      ['60-second class wrap', true, true, true],
      ['Voice hifz recording', true, true, true],
      ['Praise & homework', true, true, true],
      ['Offline class wrap (coming soon)', false, false, false],
    ],
  },
  {
    heading: 'For principals',
    rows: [
      ['Daily dashboard', false, true, true],
      ['Tuition pipeline', false, true, true],
      ['Enrollment funnel (coming soon)', false, false, false],
      ['Board CSV exports', false, true, true],
      ['SSO (Google / Microsoft)', false, false, true],
      ['Dedicated onboarding manager', false, false, true],
    ],
  },
];

function cell(v: boolean) {
  return v ? (
    <span style={{ color: 'var(--accent-700)' }}>
      <Icon name="check" size={16} />
    </span>
  ) : (
    <span style={{ color: 'var(--subtle)' }}>·</span>
  );
}

function ComparisonTable() {
  return (
    <section
      className="section"
      style={{
        background: 'var(--bg-warm)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">
            <span className="dot" />
            What&apos;s included
          </span>
          <h2>Every tier ships with every feature your parents and teachers need.</h2>
          <p>
            The only differences are at the principal level. That&apos;s where larger schools
            justify the larger tier.
          </p>
        </div>

        <div className="compare">
          <div className="compare-row head">
            <div className="compare-cell head">Feature</div>
            <div className="compare-cell head center">Quran Tutor</div>
            <div className="compare-cell head center">Weekend School</div>
            <div className="compare-cell head center">Full-time Academy</div>
          </div>
          {SECTIONS.map((s) => (
            <Fragment key={s.heading}>
              <div className="compare-row">
                <div
                  className="compare-cell"
                  style={{
                    background: 'var(--bg-warm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--muted)',
                    fontWeight: 600,
                  }}
                >
                  {s.heading}
                </div>
                <div className="compare-cell" style={{ background: 'var(--bg-warm)' }} />
                <div className="compare-cell" style={{ background: 'var(--bg-warm)' }} />
                <div className="compare-cell" style={{ background: 'var(--bg-warm)' }} />
              </div>
              {s.rows.map((r) => (
                <div className="compare-row" key={r[0]}>
                  <div className="compare-cell feature">{r[0]}</div>
                  <div className="compare-cell center">{cell(r[1])}</div>
                  <div className="compare-cell center">{cell(r[2])}</div>
                  <div className="compare-cell center">{cell(r[3])}</div>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: 'Do you charge per parent or per student?',
      a: 'Per student. Parents are free. You want as many parents in the feed as possible. A student with two parents and two grandparents still counts as one student.',
    },
    {
      q: 'What about Stripe fees on tuition?',
      a: "Standard Stripe processing fees apply and pass through directly. Talibly itself takes nothing on top of that. See Stripe's website for current rates.",
    },
    {
      q: 'Can I import students from my existing spreadsheet?',
      a: 'We handle roster import as part of onboarding — usually a weekend turnaround. Self-service CSV import is on the roadmap.',
    },
    {
      q: 'Is there a setup fee?',
      a: 'No. No setup, no onboarding fee, no contract. If Talibly is not the right fit, you cancel from settings and your data exports as CSV.',
    },
    {
      q: 'What if our school is between tiers? Say 30 weekend students plus a few tutors.',
      a: "Most schools at that size start on the Weekend School tier. Tell us the breakdown when you book a demo and we'll be honest about which tier fits.",
    },
    {
      q: 'Do you support Arabic / Urdu / French interfaces?',
      a: 'Arabic and Urdu UI for the parent app are on the roadmap and not in v1. The app and content support Arabic text and RTL surahs today, but the buttons are English-only for now.',
    },
  ];
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">
            <span className="dot" />
            Frequently asked
          </span>
          <h2>Questions principals always ask.</h2>
        </div>
        <div className="faq">
          {items.map((it) => (
            <div className="faq-item" key={it.q}>
              <h5>{it.q}</h5>
              <p>{it.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  return (
    <>
      <SiteNav />
      <PricingHeroAndTiers />
      <ComparisonTable />
      <FAQ />
      <SiteCTA
        title="Try Talibly with your school for free, for a month."
        body="No card on file. We'll onboard, import your roster, and train your teachers. If it's not better than your current setup, walk away. Your data exports as CSV."
        cta="Book a demo"
      />
      <SiteFooter />
    </>
  );
}
