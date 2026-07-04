import { Icon } from '@/components/marketing/icon';
import { Dashboard } from '@/components/marketing/mocks';
import { PageHero } from '@/components/marketing/page-hero';
import { PageLayout } from '@/components/marketing/persona-sidebar';
import { SiteCTA } from '@/components/marketing/site-cta';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteNav } from '@/components/marketing/site-nav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Talibly · For principals',
  description:
    'Daily attendance, tuition pipeline, hifz wins. The dashboard secular schools have had for two decades.',
};

function PrincipalsHero() {
  return (
    <PageHero
      eyebrow="For principals"
      title="Run the school from"
      titleAccent="one screen."
      lede="Daily attendance, tuition pipeline, hifz wins, and the messages waiting for a reply. All on the same page. Talibly gives Islamic school principals the dashboard that secular schools have had for two decades."
      secondaryCta="See pricing"
      secondaryHref="/pricing"
    >
      <Dashboard />
    </PageHero>
  );
}

function FullDashboardSection() {
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
        <div className="section-head center">
          <span className="eyebrow">
            <span className="dot" />
            The Sunday-morning view
          </span>
          <h2>Everything that matters, on one screen, by 8:45 AM.</h2>
          <p>
            Before the first parent pulls into the lot, you already know how the day is going to go.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div style={{ transform: 'scale(1.05)', transformOrigin: 'top center', maxWidth: 760 }}>
            <Dashboard />
          </div>
        </div>
      </div>
    </section>
  );
}

function PrincipalsBento() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">
            <span className="dot" />
            The principal&apos;s toolkit
          </span>
          <h2>What you stop doing manually.</h2>
          <p>
            If your job involves an Excel sheet of attendance, a clipboard of tuition checks, or a
            Friday night phone tree, those are the parts Talibly takes over.
          </p>
        </div>

        <div className="bento">
          <div className="bento-cell b-c3">
            <div className="bento-eyebrow">
              <Icon name="check" size={12} />
              Attendance roll-up
            </div>
            <h4>The whole school, by 9:15 AM.</h4>
            <p>
              Every class wraps, the numbers roll up. See which classes haven&apos;t submitted yet
              so you can nudge the teacher before parents start asking.
            </p>
            <div className="bento-art">
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {(
                  [
                    { t: 'Year 1 · Br. Idris', p: '18 / 20', s: 'done', d: '90%' },
                    { t: 'Year 2 · Sr. Amina', p: '21 / 22', s: 'done', d: '95%' },
                    { t: 'Year 3 · Sr. Sumayya', p: '19 / 21', s: 'done', d: '90%' },
                    { t: 'Year 4 · Br. Hamza', p: 'pending', s: 'pending' },
                  ] as { t: string; p: string; s: 'done' | 'pending'; d?: string }[]
                ).map((r, i, a) => (
                  <div
                    key={r.t}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 'none',
                      fontSize: 12,
                      alignItems: 'center',
                    }}
                  >
                    <span>{r.t}</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: r.s === 'pending' ? '#b45309' : 'var(--accent-700)',
                        fontWeight: 600,
                      }}
                    >
                      {r.p} {r.d && `· ${r.d}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bento-cell b-c3 tint">
            <div className="bento-eyebrow">
              <Icon name="money" size={12} />
              Tuition pipeline
            </div>
            <h4>$8,400 collected. $1,200 outstanding.</h4>
            <p>
              Paid, upcoming, and overdue — all in one view. Know exactly where every tuition dollar stands before the day starts.
            </p>
            <div className="bento-art">
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { l: 'Collected', v: '$8.4k', a: '#059669' },
                  { l: 'Upcoming', v: '$2.1k', a: '#6366f1' },
                  { l: 'Overdue', v: '$1.2k', a: '#f59e0b' },
                ].map((s) => (
                  <div
                    key={s.l}
                    style={{
                      flex: 1,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        color: s.a,
                      }}
                    >
                      {s.v}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontFamily: 'var(--font-mono)',
                        marginTop: 4,
                      }}
                    >
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bento-cell b-c2 dark">
            <div className="bento-eyebrow">
              <Icon name="star" size={12} />
              Hifz wins board
            </div>
            <h4>Who finished what, this week.</h4>
            <p>
              Every juz milestone, every surah completed. The kind of news your board chair loves at
              the Friday majlis.
            </p>
          </div>

          <div className="bento-cell b-c2 warm">
            <div className="bento-eyebrow">
              <Icon name="parent" size={12} />
              Enrollment funnel
              <span style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 9, background: '#fde68a', color: '#92400e', padding: '1px 5px', borderRadius: 4 }}>COMING SOON</span>
            </div>
            <h4>Inquiry. Tour. Registered. Paid.</h4>
            <p>
              Every prospective family, traced from first email to first tuition charge. On the roadmap for the next release.
            </p>
          </div>

          <div className="bento-cell b-c2 cool">
            <div className="bento-eyebrow">
              <Icon name="msg" size={12} />
              Messages
              <span style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 9, background: '#e0e7ff', color: '#3730a3', padding: '1px 5px', borderRadius: 4 }}>COMING SOON</span>
            </div>
            <h4>One inbox for every conversation.</h4>
            <p>
              Direct messages between principals, teachers, and parents — in one place. On the roadmap for the next release.
            </p>
          </div>

          <div className="bento-cell b-c6">
            <div className="bento-eyebrow">
              <Icon name="shield" size={12} />
              Board-ready CSV exports
            </div>
            <h4>Your masjid trustees won&apos;t ask twice.</h4>
            <p style={{ maxWidth: 620 }}>
              Export a clean CSV of your full attendance history, tuition ledger, student roster, or hifz milestones with one click. Ready for your board packet or bookkeeper, not for more spreadsheeting on your end.
            </p>
            <div className="bento-art" style={{ marginTop: 16 }}>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 500,
                    display: 'inline-flex',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <Icon name="paper" size={14} /> attendance-nov-2026.csv
                </div>
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 500,
                    display: 'inline-flex',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <Icon name="paper" size={14} /> tuition-ledger-q4.csv
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PrincipalQuote() {
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
        <div className="quote">
          <div className="q-mark">&ldquo;</div>
          <blockquote>
            I used to spend every Tuesday night reconciling Zelle screenshots against the attendance
            binder. The first time I generated a board report in two clicks, our chair asked if
            we&apos;d hired an admin assistant.
          </blockquote>
          <div className="who">
            <strong>Imam Yusuf K.</strong> · Principal · Sunday school, 240 students, Texas
          </div>
          <div style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 12, fontStyle: 'italic' }}>
            Illustrative example — Talibly is newly launched.
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ForPrincipalsPage() {
  return (
    <>
      <SiteNav />
      <PageLayout>
        <PrincipalsHero />
        <FullDashboardSection />
        <PrincipalsBento />
        <PrincipalQuote />
        <SiteCTA
          title="Run your school like the secular one across the street."
          body="We'll do the data migration, train your teachers, and get your tuition plans set up in Talibly."
        />
      </PageLayout>
      <SiteFooter />
    </>
  );
}
