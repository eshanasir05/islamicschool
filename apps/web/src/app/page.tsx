import { Icon } from '@/components/marketing/icon';
import {
  AttendanceCard,
  Dashboard,
  HeroFloat1,
  HeroFloat2,
  HeroPhone,
  HifzCard,
  HomeworkCard,
  PaymentsCard,
  PraiseCard,
  TeacherWrap,
} from '@/components/marketing/mocks';
import { SiteCTA } from '@/components/marketing/site-cta';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteNav } from '@/components/marketing/site-nav';
import Link from 'next/link';

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow">
            <span className="dot" />
            Built for Islamic schools and Quran tutors
          </span>
          <h1>
            A modern home for your child&apos;s <span className="serif">Islamic</span> education.
          </h1>
          <p className="lede">
            Most Islamic schools are still run on WhatsApp groups, paper attendance sheets, and
            Zelle screenshots. Talibly is the app that finally replaces all three. It&apos;s quiet
            for parents, fast for teachers, and easy for the principal to actually use on a Sunday
            morning.
          </p>
          <div className="hero-cta">
            <Link className="btn btn-accent" href="#demo">
              Book a demo
              <Icon name="arrow" size={14} />
            </Link>
            <Link className="btn btn-ghost" href="/for-parents">
              See the parent app
            </Link>
          </div>
          <div className="hero-meta">
            <span className="check">
              <Icon name="check" size={14} />
              No setup fees
            </span>
            <span className="check">
              <Icon name="check" size={14} />
              Your roster, imported in a weekend
            </span>
            <span className="check">
              <Icon name="check" size={14} />
              Built in North America
            </span>
          </div>
        </div>

        <div className="hero-stage">
          <HeroFloat1 />
          <HeroPhone />
          <HeroFloat2 />
        </div>
      </div>
    </section>
  );
}

function Replace() {
  const items = [
    {
      strike: 'WhatsApp class group',
      now: 'A quiet feed for each child',
      sub: 'Praise, hifz, attendance, homework. All sorted by child. Nothing lost in a chat with 47 unread messages.',
    },
    {
      strike: 'Paper attendance sheets',
      now: 'Tap to mark, on any device',
      sub: 'Teachers wrap a class in about a minute. Parents get a push the moment their kid is marked late.',
    },
    {
      strike: 'Zelle screenshots',
      now: 'One-tap tuition, already reconciled',
      sub: 'Stripe-powered tuition with autopay, sibling discounts, and a ledger your bookkeeper will actually open.',
    },
  ];
  return (
    <section className="replace">
      <div className="container replace-grid">
        <div>
          <span className="eyebrow">
            <span className="dot" />
            What we replace
          </span>
          <h2>The three things every Islamic school runs on.</h2>
        </div>
        <div className="replace-list">
          {items.map((it) => (
            <div className="replace-card" key={it.strike}>
              <div className="strike">
                <span className="strike-dot" />
                {it.strike}
              </div>
              <div className="now">{it.now}</div>
              <div className="now-sub">{it.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ParentSection() {
  return (
    <section className="section" id="parent">
      <div className="container">
        <div className="feature-grid">
          <div className="feature-copy">
            <span className="eyebrow">
              <span className="dot" />
              For parents
            </span>
            <h3>Your child&apos;s week, in your pocket.</h3>
            <p className="body">
              A calm feed for each of your kids. Hear them recite the ayah they learned today. Read
              what the teacher said about them. Know they walked in late before you find out at
              pickup.
            </p>
            <ul className="feature-bullets">
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Hifz audio.</strong> Your child&apos;s actual recitation, recorded in
                  class, on your phone tonight.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Attendance pings.</strong> A push notification the moment they&apos;re
                  marked present, late, or absent.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Teacher praise.</strong> Adab, effort, improvement, helpfulness. In the
                  teacher&apos;s own words.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Clear homework.</strong> One task. One due date. No PDF rummaging.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Multi-child switcher.</strong> Aisha&apos;s day and Yusuf&apos;s day, one
                  tap apart.
                </span>
              </li>
            </ul>
            <Link className="btn-link" href="/for-parents">
              Walk through the parent app
              <Icon name="arrow" size={14} />
            </Link>
          </div>

          <div className="stage accent">
            <div className="stage-grid-bg" />
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 420,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <HifzCard
                surah="Surah Al-Fatihah"
                range="Ayah 5 – 7"
                stream="Sabak"
                duration={47}
                teacher="Sister Sumayya"
                playing={true}
              />
              <PraiseCard
                category="Helpfulness"
                note="Aisha helped a younger student tie her hijab today, mashallah. She has been such a kind presence in the class this month."
                teacher="Sister Sumayya"
              />
              <HomeworkCard
                title="Practice Surah Al-Fatihah ayah 5 three times with a parent"
                due="Due Sunday"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TeacherSection() {
  return (
    <section
      className="section"
      id="teacher"
      style={{
        background: 'var(--bg-warm)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="container">
        <div className="feature-grid reverse">
          <div className="feature-copy">
            <span className="eyebrow">
              <span className="dot" />
              For teachers
            </span>
            <h3>
              Wrap a class in <span className="serif">sixty seconds.</span>
            </h3>
            <p className="body">
              Three taps and you&apos;re done: attendance, hifz, praise. No more telling yourself
              you&apos;ll update the WhatsApp group when you get home. By the time you&apos;ve put
              your shoes back on, every parent already knows how their kid did.
            </p>
            <ul className="feature-bullets">
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>One screen, top to bottom.</strong> A guided wrap so nothing gets
                  forgotten.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Tap to record hifz.</strong> Kid recites, you tap stop. Parents hear it
                  tonight.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Praise presets.</strong> Adab, effort, improvement, helpfulness. Tap, type
                  one line, done.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Works on the phone in your pocket.</strong> iOS, Android, web.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Offline tolerant.</strong> Record in the masjid basement. It syncs when
                  you&apos;re back to wifi.
                </span>
              </li>
            </ul>
            <Link className="btn-link" href="/for-teachers">
              See the teacher flow
              <Icon name="arrow" size={14} />
            </Link>
          </div>

          <div className="stage warm">
            <div className="stage-grid-bg" />
            <TeacherWrap />
          </div>
        </div>
      </div>
    </section>
  );
}

function PrincipalSection() {
  return (
    <section className="section" id="principal">
      <div className="container">
        <div className="feature-grid">
          <div className="feature-copy">
            <span className="eyebrow">
              <span className="dot" />
              For principals
            </span>
            <h3>Your school, at a glance, before parking lot duty.</h3>
            <p className="body">
              Daily attendance, tuition, hifz progress, and the messages waiting for a reply. All on
              one page. When the trustees ask for a board report, you&apos;ve got it in two clicks.
            </p>
            <ul className="feature-bullets">
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Daily attendance roll-up</strong> across every class and every teacher.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Tuition pipeline.</strong> Paid, upcoming, overdue. With a one-click
                  nudge.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Hifz wins.</strong> See which students hit milestones this week.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Enrollment funnel.</strong> Inquiry, tour, registered, first paid.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Board-ready exports.</strong> PDF or CSV. Trustees won&apos;t have to ask
                  twice.
                </span>
              </li>
            </ul>
            <Link className="btn-link" href="/for-principals">
              Tour the principal dashboard
              <Icon name="arrow" size={14} />
            </Link>
          </div>

          <div className="stage cool">
            <div className="stage-grid-bg" />
            <Dashboard />
          </div>
        </div>
      </div>
    </section>
  );
}

function Tuition() {
  return (
    <section
      className="section"
      id="pricing-preview"
      style={{
        background: 'var(--bg-warm)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="container">
        <div className="tuition-grid">
          <div className="feature-copy">
            <span className="eyebrow">
              <span className="dot" />
              Tuition
            </span>
            <h3>No more Zelle screenshots. No more &ldquo;did the check clear?&rdquo;</h3>
            <p className="body">
              Talibly bills parents directly. Autopay, sibling discounts, scholarship rules, and a
              ledger your bookkeeper will actually open. It runs on Stripe, so the money is real and
              the reconciliation isn&apos;t your job.
            </p>
            <ul className="feature-bullets">
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Autopay</strong> with Visa, Mastercard, or ACH. Set it on registration and
                  forget about it.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Sibling and scholarship discounts</strong> applied automatically.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>One-tap nudge</strong> for late tuition. Polite, in the parent&apos;s
                  preferred channel.
                </span>
              </li>
              <li>
                <Icon name="check" size={16} />
                <span>
                  <strong>Reconciled ledger.</strong> Every dollar tied back to a student and a
                  month.
                </span>
              </li>
            </ul>
            <Link className="btn-link" href="/pricing">
              See pricing
              <Icon name="arrow" size={14} />
            </Link>
          </div>

          <div className="stage" style={{ minHeight: 560, paddingRight: 64, paddingBottom: 72 }}>
            <div className="stage-grid-bg" />
            <PaymentsCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function Roles() {
  const roles = [
    {
      icon: 'parent' as const,
      title: 'Parents',
      blurb:
        'Daily highlights, hifz audio, one-tap tuition. A quiet feed per child, instead of a class chat with 47 unread.',
      bullets: [
        'Multi-child switcher',
        'Hifz audio replay',
        'Autopay tuition',
        'Push notifications',
      ],
      href: '/for-parents',
    },
    {
      icon: 'teacher' as const,
      title: 'Teachers',
      blurb:
        'A class wrap that takes about a minute. Mark attendance, record hifz, send praise without staying late.',
      bullets: ['Tap-to-mark attendance', 'Voice-record hifz', 'Praise presets', 'Mobile & web'],
      href: '/for-teachers',
    },
    {
      icon: 'principal' as const,
      title: 'Principals',
      blurb:
        'Daily dashboard, tuition pipeline, board-ready exports. Your masjid trustees will be impressed.',
      bullets: ['Attendance roll-up', 'Tuition pipeline', 'Enrollment funnel', 'Board exports'],
      href: '/for-principals',
    },
  ];
  return (
    <section className="roles">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow">
            <span className="dot" />
            One platform, three jobs
          </span>
          <h2>Built for everyone who shows up Sunday morning.</h2>
          <p>
            Each role gets a tool built for their job. Not a generic SIS dashboard with
            everyone&apos;s needs jammed into the same screen.
          </p>
        </div>
        <div className="roles-grid">
          {roles.map((r) => (
            <Link
              className="role-card"
              key={r.title}
              href={r.href}
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div className="role-icon">
                <Icon name={r.icon} size={20} />
              </div>
              <h4>{r.title}</h4>
              <p>{r.blurb}</p>
              <ul>
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Availability() {
  return (
    <section className="availability">
      <div className="container availability-grid">
        <div>
          <span className="eyebrow">
            <span className="dot" />
            Available everywhere your school is
          </span>
          <h2>iOS, Android, and the browser on the masjid laptop.</h2>
          <p>
            Parents and teachers reach for a phone. Principals reach for the laptop in the office.
            Talibly is the same product on all three. Same data, same flows. No &ldquo;use the
            desktop one for that.&rdquo;
          </p>
          <div className="platforms">
            <span className="platform-pill">
              <Icon name="apple" size={16} />
              iOS
            </span>
            <span className="platform-pill">
              <Icon name="android" size={16} />
              Android
            </span>
            <span className="platform-pill">
              <Icon name="web" size={16} />
              Web
            </span>
          </div>
        </div>
        <div
          className="stage"
          style={{
            minHeight: 460,
            background: 'linear-gradient(180deg, #fff 0%, #f5f5f4 100%)',
          }}
        >
          <div className="stage-grid-bg" />
          <div
            style={{
              position: 'relative',
              display: 'flex',
              gap: 18,
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                width: 200,
                height: 360,
                background: 'var(--fg)',
                borderRadius: 28,
                padding: 6,
                boxShadow: 'var(--shadow-2)',
              }}
            >
              <div
                style={{
                  background: 'var(--bg)',
                  borderRadius: 22,
                  height: '100%',
                  overflow: 'hidden',
                  padding: '14px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--muted)',
                  }}
                >
                  parent · iOS
                </div>
                <AttendanceCard status="present" time="9:05" />
                <HifzCard
                  surah="Al-Fatihah"
                  range="Ayah 1–4"
                  stream="Sabak"
                  duration={38}
                  teacher="S. Sumayya"
                />
              </div>
            </div>
            <div
              style={{
                width: 220,
                height: 400,
                background: 'var(--fg)',
                borderRadius: 32,
                padding: 7,
                boxShadow: 'var(--shadow-2)',
                transform: 'translateY(-12px)',
              }}
            >
              <div
                style={{
                  background: 'var(--bg)',
                  borderRadius: 26,
                  height: '100%',
                  overflow: 'hidden',
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--muted)',
                  }}
                >
                  teacher · Android
                </div>
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Class wrap</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--accent-700)',
                        background: 'var(--accent-soft)',
                        padding: '2px 6px',
                        borderRadius: 999,
                      }}
                    >
                      0:42
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {['Aisha R.', 'Yusuf M.', 'Khadijah B.', 'Bilal A.'].map((n) => (
                      <div
                        key={n}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11,
                          padding: '4px 6px',
                          background: 'var(--bg-warm)',
                          borderRadius: 6,
                        }}
                      >
                        <span>{n}</span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--accent-700)',
                          }}
                        >
                          ✓
                        </span>
                      </div>
                    ))}
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

function Stats() {
  return (
    <section className="container">
      <div className="stats">
        <div className="stat-cell">
          <div className="num">
            <span className="accent">60</span>s
          </div>
          <div className="lbl">
            From &ldquo;class is over&rdquo; to every parent knowing how their kid did.
          </div>
        </div>
        <div className="stat-cell">
          <div className="num">
            3<span className="accent">×</span>
          </div>
          <div className="lbl">Three roles, one platform: parent, teacher, principal.</div>
        </div>
        <div className="stat-cell">
          <div className="num">
            $<span className="accent">0</span>
          </div>
          <div className="lbl">Setup fees, contracts, or per-feature gotchas.</div>
        </div>
        <div className="stat-cell">
          <div className="num">
            <span className="accent">1</span>
          </div>
          <div className="lbl">Quiet feed per child. No more WhatsApp group chaos.</div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <SiteNav />
      <Hero />
      <Replace />
      <ParentSection />
      <TeacherSection />
      <PrincipalSection />
      <Roles />
      <Tuition />
      <Availability />
      <Stats />
      <SiteCTA />
      <SiteFooter />
    </>
  );
}
