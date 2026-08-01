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
    'Flat-rate Talibly plans selected by school size, with no per-student fees and two months free on annual billing.',
};

type Availability = boolean | 'planned';

const SECTIONS: {
  heading: string;
  rows: [string, Availability, Availability, Availability][];
}[] = [
  {
    heading: 'For parents',
    rows: [
      ['Multi-child feed', true, true, true],
      ['Hifz audio replay', true, true, true],
      ['Parent feed updates', true, true, true],
      ['Tuition tracking', true, true, true],
      ['SMS notifications (planned)', 'planned', 'planned', 'planned'],
      ['Native iOS & Android apps (planned)', 'planned', 'planned', 'planned'],
    ],
  },
  {
    heading: 'For teachers',
    rows: [
      ['60-second class wrap', true, true, true],
      ['Voice hifz recording', true, true, true],
      ['Praise & homework', true, true, true],
      ['Offline class wrap (planned)', 'planned', 'planned', 'planned'],
    ],
  },
  {
    heading: 'For principals',
    rows: [
      ['Daily dashboard', false, true, true],
      ['Tuition pipeline', false, true, true],
      ['Self-service roster import', false, true, true],
      ['Board CSV exports', false, true, true],
      ['Full enrollment workflow (planned)', 'planned', 'planned', 'planned'],
      ['SSO with Google or Microsoft (planned)', 'planned', 'planned', 'planned'],
    ],
  },
];

function cell(value: Availability) {
  if (value === 'planned') {
    return <span className="badge-coming-soon">Planned</span>;
  }

  return value ? (
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
          <h2>Clear capabilities for every stage of your school.</h2>
          <p>
            Plans are selected by active student count. Current capabilities are shown separately
            from planned additions so you can evaluate Talibly clearly.
          </p>
        </div>

        <div className="compare">
          <div className="compare-row head">
            <div className="compare-cell head">Feature</div>
            <div className="compare-cell head center">Quran Tutor</div>
            <div className="compare-cell head center">Weekend School</div>
            <div className="compare-cell head center">Full-time Academy</div>
          </div>
          {SECTIONS.map((section) => (
            <Fragment key={section.heading}>
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
                  {section.heading}
                </div>
                <div className="compare-cell" style={{ background: 'var(--bg-warm)' }} />
                <div className="compare-cell" style={{ background: 'var(--bg-warm)' }} />
                <div className="compare-cell" style={{ background: 'var(--bg-warm)' }} />
              </div>
              {section.rows.map((row) => (
                <div className="compare-row" key={row[0]}>
                  <div className="compare-cell feature">{row[0]}</div>
                  <div className="compare-cell center">{cell(row[1])}</div>
                  <div className="compare-cell center">{cell(row[2])}</div>
                  <div className="compare-cell center">{cell(row[3])}</div>
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
      q: 'Do you charge per student?',
      a: "No. Each plan is a flat rate selected by the school's active student count. There are no per-student fees or overage charges.",
    },
    {
      q: 'Does Talibly take a percentage of school tuition?',
      a: 'No. Talibly takes 0% of school tuition and charges only the SaaS subscription fee. Schools will eventually connect their own Stripe account for tuition processing; standard Stripe processing fees will apply separately.',
    },
    {
      q: 'Can I import students from my existing spreadsheet?',
      a: 'Yes. Self-service CSV roster import is currently available, and guided onboarding can help your school prepare and review its data.',
    },
    {
      q: 'Can our school subscribe online today?',
      a: 'Not yet. Talibly is being finalized for a future public SaaS launch. Pricing inquiries and planned trials are handled through a sales conversation rather than an online Stripe subscription checkout.',
    },
    {
      q: 'What if our school is between tiers?',
      a: 'Plans are selected by total active student count. A school with 30 active students fits the Weekend School plan; schools with 751+ students or multiple campuses should contact us about Enterprise.',
    },
    {
      q: 'What unfinished features are planned?',
      a: 'Full enrollment, SSO, offline support, SMS, native mobile apps, and additional language interfaces are planned or coming later. The current product is a responsive English-language web app.',
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
          {items.map((item) => (
            <div className="faq-item" key={item.q}>
              <h5>{item.q}</h5>
              <p>{item.a}</p>
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
        title="A 30-day, no-card trial is planned."
        body="Trials will be sales-approved while Talibly is being finalized for public SaaS launch. Request a conversation to see the current product and discuss fit for your school."
        cta="Request a conversation"
      />
      <SiteFooter />
    </>
  );
}
