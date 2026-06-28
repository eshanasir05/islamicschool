import { Icon } from '@/components/marketing/icon';
import { TeacherWrap } from '@/components/marketing/mocks';
import { PageHero } from '@/components/marketing/page-hero';
import { PageLayout } from '@/components/marketing/persona-sidebar';
import { SiteCTA } from '@/components/marketing/site-cta';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteNav } from '@/components/marketing/site-nav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Talibly · For teachers',
  description:
    'Wrap your class in sixty seconds. Attendance, hifz, praise. One screen, top to bottom.',
};

function TeachersHero() {
  return (
    <PageHero
      eyebrow="For teachers"
      title="Wrap your class in"
      titleAccent="sixty seconds."
      lede="Three taps and you're done: attendance, hifz, praise. Talibly turns the 20 minutes of post-class admin you used to do at home into one screen, top to bottom. Done before parents finish loading shoes."
      secondaryCta="See pricing"
      secondaryHref="/pricing"
    >
      <TeacherWrap />
    </PageHero>
  );
}

function ClassWrapAnatomy() {
  const steps = [
    {
      n: '01',
      t: 'Mark attendance',
      d: 'Tap each student to cycle Present, Late, or Absent. Bulk-mark the whole roster present, then tap the exceptions.',
      secs: '0:00 to 0:15',
    },
    {
      n: '02',
      t: 'Record hifz',
      d: "For whoever's turn it is today: tap mic, child recites, tap stop. Audio uploads while you keep teaching.",
      secs: '0:15 to 0:40',
    },
    {
      n: '03',
      t: 'Praise and homework',
      d: 'Pick a category (Adab, Effort, Improvement, Helpfulness) and type one line. Assign homework once for the whole class.',
      secs: '0:40 to 0:55',
    },
    {
      n: '04',
      t: 'Confirm and send',
      d: 'Review what goes home. Tap publish. Every parent gets the feed before you reach the parking lot.',
      secs: '0:55 to 1:00',
    },
  ];
  return (
    <section className="section" style={{ paddingTop: 64 }}>
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">
            <span className="dot" />
            Anatomy of a class wrap
          </span>
          <h2>Four taps. One minute. Every parent in the loop.</h2>
          <p>
            The wrap is designed for the teacher who&apos;s holding their phone in one hand while a
            six-year-old asks where their kufi went. It&apos;s that fast on purpose.
          </p>
        </div>

        <div className="timeline">
          {steps.map((s) => (
            <div className="timeline-step" key={s.n}>
              <span className="num">{s.n}</span>
              <h5>{s.t}</h5>
              <p>{s.d}</p>
              <div className="secs">{s.secs}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeachersBento() {
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
            Built for the way you actually teach
          </span>
          <h2>The features that make the 60 seconds possible.</h2>
        </div>

        <div className="bento">
          <div className="bento-cell b-c3">
            <div className="bento-eyebrow">
              <Icon name="check" size={12} />
              Tap-to-mark
            </div>
            <h4>Attendance is one swipe.</h4>
            <p>
              Tap a student name to cycle through Present, Late, Absent. Late automatically
              time-stamps the arrival.
            </p>
            <div className="bento-art">
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {[
                  { n: 'Aisha R.', p: 'present', t: '9:01' },
                  { n: 'Yusuf M.', p: 'late', t: '9:18' },
                  { n: 'Khadijah B.', p: 'present', t: '9:00' },
                ].map((s) => (
                  <div
                    key={s.n}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'var(--bg-warm)',
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{s.n}</span>
                    <span className={`tw-pill ${s.p}`}>
                      {s.p.toUpperCase()} {s.t}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bento-cell b-c3 tint">
            <div className="bento-eyebrow">
              <Icon name="mic" size={12} />
              Voice hifz
            </div>
            <h4>Tap mic. Child recites. Done.</h4>
            <p>
              The recording uploads in the background. Tagged automatically with surah, stream
              (Sabak / Sabqi / Manzil), and ayah range.
            </p>
            <div className="bento-art">
              <div className="tw-rec" style={{ background: 'var(--surface)' }}>
                <div className="tw-rec-mic">
                  <Icon name="mic" size={16} />
                </div>
                <div className="tw-rec-wave">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: static visualization
                      key={i}
                      style={{
                        height: `${20 + Math.sin(i * 0.7) * 30 + (i % 3) * 10}%`,
                        animationDelay: `${i * 0.06}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="tw-rec-time">0:38</div>
              </div>
            </div>
          </div>

          <div className="bento-cell b-c2 dark">
            <div className="bento-eyebrow">
              <Icon name="star" size={12} />
              Praise presets
            </div>
            <h4>Adab. Effort. Improvement. Helpfulness.</h4>
            <p>
              Pick the category, type one line. Parents get the kind of feedback they&apos;ve never
              gotten before.
            </p>
          </div>

          <div className="bento-cell b-c2 warm">
            <div className="bento-eyebrow">
              <Icon name="cal" size={12} />
              One-tap homework
            </div>
            <h4>Assign once. Whole class.</h4>
            <p>Type it. Pick a due date. Every parent in the class sees it tonight.</p>
          </div>

          <div className="bento-cell b-c2">
            <div className="bento-eyebrow">
              <Icon name="phone" size={12} />
              Mobile-friendly web
            </div>
            <h4>Whichever screen is closest.</h4>
            <p>
              The teacher app works on any phone browser or the masjid laptop. Same wrap on every
              screen. No app install required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TeacherQuote() {
  return (
    <section className="section">
      <div className="container">
        <div className="quote">
          <div className="q-mark">&ldquo;</div>
          <blockquote>
            I used to do all my class notes on Sunday night after putting my own kids to bed. Now
            I&apos;m done before I leave the masjid parking lot. And parents are actually reading
            what I write. Mashallah.
          </blockquote>
          <div className="who">
            <strong>Sister Aisha</strong> · Quran teacher · Full-time Islamic academy, Ontario
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ForTeachersPage() {
  return (
    <>
      <SiteNav />
      <PageLayout>
        <TeachersHero />
        <ClassWrapAnatomy />
        <TeachersBento />
        <TeacherQuote />
        <SiteCTA
          title="Wrap your next class in 60 seconds."
          body="Show this to your principal. We'll handle onboarding, training, and roster import. Your first weekend on Talibly is on us."
        />
      </PageLayout>
      <SiteFooter />
    </>
  );
}
