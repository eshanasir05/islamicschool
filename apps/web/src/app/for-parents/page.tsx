import { Icon } from '@/components/marketing/icon';
import {
  HeroFloat1,
  HeroPhone,
  HifzCard,
  HomeworkCard,
  PraiseCard,
} from '@/components/marketing/mocks';
import { PageHero } from '@/components/marketing/page-hero';
import { PageLayout } from '@/components/marketing/persona-sidebar';
import { SiteCTA } from '@/components/marketing/site-cta';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteNav } from '@/components/marketing/site-nav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Talibly · For parents',
  description:
    'One feed per child. Hifz audio, attendance updates, teacher praise, homework, tuition. All in one place.',
};

function ParentsHero() {
  return (
    <PageHero
      eyebrow="For parents"
      title="Know how your kid did at Quran class, without scrolling 47"
      titleAccent="WhatsApps."
      lede="Talibly is one feed per child. Recordings of their hifz, the praise their teacher wrote today, attendance pings, homework, tuition. All in one place. No more group chat archaeology."
      secondaryCta="See pricing"
      secondaryHref="/pricing"
    >
      <HeroPhone />
      <HeroFloat1 />
    </PageHero>
  );
}

function ParentsBento() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">
            <span className="dot" />
            Everything a parent actually needs
          </span>
          <h2>The feed Muslim parents always wished they had.</h2>
          <p>Not a generic SIS portal with a thousand tabs. A handful of things, done properly.</p>
        </div>

        <div className="bento">
          <div className="bento-cell b-c4 tint">
            <div className="bento-eyebrow">
              <Icon name="mic" size={12} />
              Hifz audio
            </div>
            <h4>Hear them recite, tonight.</h4>
            <p>
              Every hifz card has the actual recording your child made in class today. Sabak, Sabqi,
              Manzil. All labelled, dated, and easy to replay on the drive home.
            </p>
            <div className="bento-art">
              <HifzCard
                surah="Surah Al-Fatihah"
                range="Ayah 5 – 7"
                stream="Sabak"
                duration={47}
                teacher="Sister Sumayya"
              />
            </div>
          </div>

          <div className="bento-cell b-c2 dark">
            <div className="bento-eyebrow">
              <Icon name="phone" size={12} />
              Feed updates
            </div>
            <h4>
              Marked late at 9:18.
              <br />
              In your feed by 9:19.
            </h4>
            <p>Attendance, hifz, praise. Your feed updates the moment the teacher taps save.</p>
          </div>

          <div className="bento-cell b-c3">
            <div className="bento-eyebrow">
              <Icon name="star" size={12} />
              Teacher praise
            </div>
            <h4>The compliment you would never have heard otherwise.</h4>
            <div className="bento-art">
              <PraiseCard
                category="Adab"
                note="Aisha greeted every classmate with salam this morning, mashallah."
                teacher="Sister Sumayya"
              />
            </div>
          </div>

          <div className="bento-cell b-c3">
            <div className="bento-eyebrow">
              <Icon name="cal" size={12} />
              Homework
            </div>
            <h4>One task. One due date. No PDF rummaging.</h4>
            <div className="bento-art">
              <HomeworkCard
                title="Practice Surah Al-Fatihah ayah 5 three times with a parent"
                due="Due Sunday"
              />
            </div>
          </div>

          <div className="bento-cell b-c3 warm">
            <div className="bento-eyebrow">
              <Icon name="parent" size={12} />
              Multi-child
            </div>
            <h4>Aisha&apos;s day. Yusuf&apos;s day. One tap apart.</h4>
            <p>
              Switch between children at the top of the feed. Same login, separate worlds. Each
              child&apos;s feed shows only what&apos;s about them.
            </p>
            <div className="bento-art" style={{ display: 'flex', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-700)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    A
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Aisha</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Year 3</div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 12,
                  opacity: 0.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: 'var(--bg-warm)',
                      color: 'var(--muted)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Y
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Yusuf</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Year 1</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bento-cell b-c3 cool">
            <div className="bento-eyebrow">
              <Icon name="money" size={12} />
              Tuition
            </div>
            <h4>One tap. No Zelle screenshots.</h4>
            <p>
              Autopay on the first of the month. Receipts in your inbox for tax season.
            </p>
            <div className="bento-art">
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>November tuition</div>
                    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
                      $185.00
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      gap: 6,
                      alignItems: 'center',
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-700)',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: 'currentColor',
                      }}
                    />
                    AUTOPAY
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ADayTimeline() {
  const moments = [
    { t: '9:01 AM', kind: 'attendance', title: 'Aisha is present', sub: 'Sister Sumayya · Year 3' },
    {
      t: '11:24 AM',
      kind: 'hifz',
      title: 'Hifz recorded · Sabak',
      sub: 'Surah Al-Fatihah · Ayah 5 – 7',
    },
    {
      t: '12:18 PM',
      kind: 'praise',
      title: 'Praise · Helpfulness',
      sub: '"Helped a younger student tie her hijab today."',
    },
    {
      t: '1:02 PM',
      kind: 'homework',
      title: 'Homework added',
      sub: 'Practice ayah 5 three times · Due Sunday',
    },
  ];
  const dot: Record<string, string> = {
    attendance: '#10b981',
    hifz: '#059669',
    praise: '#f59e0b',
    homework: '#6366f1',
  };
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
            <span className="dot" />A day in the feed
          </span>
          <h2>What Sunday morning looks like.</h2>
          <p>
            From drop-off to the homework reminder over dinner. One calm timeline, in your
            child&apos;s order. Not in chronological-WhatsApp-chaos order.
          </p>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 0',
            maxWidth: 720,
            margin: '0 auto',
          }}
        >
          {moments.map((m, i) => (
            <div
              key={m.t}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 24px 1fr',
                alignItems: 'center',
                gap: 16,
                padding: '18px 24px',
                borderBottom: i < moments.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--muted)',
                }}
              >
                {m.t}
              </div>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: dot[m.kind],
                  boxShadow: `0 0 0 4px ${dot[m.kind]}22`,
                }}
              />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{m.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{m.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ParentQuote() {
  return (
    <section className="section">
      <div className="container">
        <div className="quote">
          <div className="q-mark">&ldquo;</div>
          <blockquote>
            I used to scroll three WhatsApp groups to figure out if my daughter even made it to
            Quran class. Now I hear her actually reciting Al-Fatihah on the drive home, and I
            already know she&apos;s been doing well. I don&apos;t have to ask the teacher at pickup
            anymore.
          </blockquote>
          <div className="who">
            <strong>Sarah H.</strong> · Parent of two · Weekend Islamic school, New Jersey
          </div>
          <div style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 12, fontStyle: 'italic' }}>
            Illustrative example — Talibly is newly launched.
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ForParentsPage() {
  return (
    <>
      <SiteNav />
      <PageLayout>
        <ParentsHero />
        <ParentsBento />
        <ADayTimeline />
        <ParentQuote />
        <SiteCTA
          title="Try Talibly with your child's school."
          body="Forward us to your principal. We'll handle the onboarding and import the roster in a weekend."
        />
      </PageLayout>
      <SiteFooter />
    </>
  );
}
