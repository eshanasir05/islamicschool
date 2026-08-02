import { Icon, type IconName } from '@/components/marketing/icon';
import { AttendanceCard, HomeworkCard, PraiseCard } from '@/components/marketing/mocks';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteNav } from '@/components/marketing/site-nav';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Talibly · Product tour',
  description:
    'Explore Talibly through fictional product previews for principals, teachers, and parents. Talibly does not provide a public shared login.',
};

const responsiveGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
  gap: 20,
};

const previewPanelStyle: CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 18,
  background: 'var(--surface)',
  padding: 24,
  minWidth: 0,
};

const previewStackStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  marginTop: 20,
};

const WORKFLOW: Array<{
  icon: IconName;
  title: string;
  description: string;
}> = [
  {
    icon: 'principal',
    title: 'Admin enrolls a student',
    description:
      'A principal creates one fictional student profile, assigns a class, and links a fictional guardian.',
  },
  {
    icon: 'teacher',
    title: 'Teacher records the session',
    description:
      'The assigned teacher marks attendance and records a text-only Hifz update for the class.',
  },
  {
    icon: 'parent',
    title: 'Parent sees the class update',
    description:
      'The linked parent sees the student’s attendance and Quran progress in the family feed.',
  },
  {
    icon: 'money',
    title: 'Tuition follow-up arrives',
    description:
      'A past-due fictional plan creates an in-app reminder. Email is additional and depends on configured delivery.',
  },
];

type StatusTone = 'available' | 'soon' | 'planned';

const STATUS_STYLES: Record<StatusTone, { label: string; color: string; background: string }> = {
  available: {
    label: 'Available',
    color: 'var(--success-fg)',
    background: 'var(--success-bg)',
  },
  soon: {
    label: 'Coming soon',
    color: 'var(--accent)',
    background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
  },
  planned: {
    label: 'Planned',
    color: 'var(--muted)',
    background: 'var(--neutral-soft)',
  },
};

function FictionalSampleLabel() {
  return (
    <span
      className="text-label"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        color: 'var(--muted)',
        marginBottom: 12,
      }}
    >
      <span className="dot" aria-hidden="true" />
      Fictional sample preview
    </span>
  );
}

function PreviewPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: IconName;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article style={previewPanelStyle}>
      <FictionalSampleLabel />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={20} />
        </span>
        <div>
          <h3 style={{ fontSize: 20, margin: 0 }}>{title}</h3>
          <p style={{ color: 'var(--muted)', lineHeight: 1.55, margin: '4px 0 0', fontSize: 14 }}>
            {description}
          </p>
        </div>
      </div>
      <div style={previewStackStyle}>{children}</div>
    </article>
  );
}

function QuranProgressPreview() {
  return (
    <div className="ui-card">
      <div className="ui-card-head">
        <span className="dot" style={{ background: '#059669' }} aria-hidden="true" />
        <span className="label">Quran progress · Sabak</span>
      </div>
      <div className="ui-card-body">
        <p className="hifz-title">Surah Al-Fatihah</p>
        <p className="hifz-sub">Ayah 5–7 · Practising</p>
        <p className="hifz-recorder">Text update recorded by Sample Teacher</p>
      </div>
    </div>
  );
}

function OperationsPreview() {
  const items = [
    ['Enrollment', 'Fictional student linked'],
    ['Attendance', 'Present'],
    ['Hifz session', 'Surah Al-Fatihah · 1–7'],
    ['Family follow-ups', 'Review queue ready'],
    ['Tuition reminder', 'Delivered in app'],
  ];

  return (
    <div className="ui-card">
      <div className="ui-card-head">
        <span className="dot" style={{ background: '#6366f1' }} aria-hidden="true" />
        <span className="label">School operations</span>
      </div>
      <div className="ui-card-body" style={{ display: 'grid', gap: 12 }}>
        {items.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--muted)' }}>{label}</span>
            <strong style={{ textAlign: 'right' }}>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function TuitionReminderPreview() {
  return (
    <div className="ui-card">
      <div className="ui-card-head">
        <span className="dot" style={{ background: '#d97706' }} aria-hidden="true" />
        <span className="label">Tuition follow-up</span>
      </div>
      <div className="ui-card-body">
        <p className="hifz-title">Payment reminder</p>
        <p className="hifz-sub">Fictional plan · Delivered in app</p>
        <p className="hifz-recorder">
          Scheduled reminders are limited to once every seven days. Email delivery is shown only
          when configured and accepted by the email provider.
        </p>
      </div>
    </div>
  );
}

function StatusColumn({
  tone,
  title,
  items,
}: {
  tone: StatusTone;
  title: string;
  items: string[];
}) {
  const status = STATUS_STYLES[tone];

  return (
    <article style={previewPanelStyle}>
      <span
        className="text-label"
        style={{
          display: 'inline-flex',
          borderRadius: 999,
          padding: '6px 10px',
          color: status.color,
          background: status.background,
          marginBottom: 14,
        }}
      >
        {status.label}
      </span>
      <h3 style={{ fontSize: 20, margin: '0 0 14px' }}>{title}</h3>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 11 }}>
        {items.map((item) => (
          <li
            key={item}
            style={{ display: 'flex', gap: 9, lineHeight: 1.5, color: 'var(--muted)' }}
          >
            <Icon
              name={tone === 'available' ? 'check' : 'chevron-right'}
              size={16}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function ProductTourPage() {
  return (
    <>
      <SiteNav />
      <main>
        <section style={{ padding: '88px 0 72px' }} aria-labelledby="product-tour-title">
          <div className="container" style={{ maxWidth: 1120 }}>
            <div style={{ maxWidth: 780 }}>
              <span className="eyebrow" style={{ marginBottom: 16, display: 'inline-flex' }}>
                <span className="dot" aria-hidden="true" />
                Public product tour
              </span>
              <h1 id="product-tour-title" className="marketing-h1" style={{ marginBottom: 18 }}>
                See how one class update moves through the whole school.
              </h1>
              <p
                style={{
                  fontSize: 18,
                  color: 'var(--muted)',
                  lineHeight: 1.7,
                  maxWidth: 720,
                  marginBottom: 28,
                }}
              >
                Explore Talibly from the principal, teacher, and parent perspectives. These previews
                use fictional sample data and are designed for school prospects, recruiters, and
                hiring managers.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link className="btn btn-accent" href="/contact">
                  Request a guided demo
                  <Icon name="arrow" size={16} aria-hidden="true" />
                </Link>
                <Link className="btn btn-ghost" href="#tour">
                  Explore the product tour
                </Link>
              </div>
            </div>

            <div
              className="banner"
              style={{ marginTop: 40, padding: 20, lineHeight: 1.6 }}
              role="note"
              aria-label="Product tour data and access notice"
            >
              <strong>Safe preview:</strong> Everything shown below is fictional sample information.
              It does not contain real student, family, payment, email, or audio data. Talibly does
              not provide a public shared login.
            </div>
          </div>
        </section>

        <section style={{ padding: '0 0 88px' }} aria-labelledby="workflow-title">
          <div className="container" style={{ maxWidth: 1120 }}>
            <div style={{ marginBottom: 28 }}>
              <span className="text-label">The connected workflow</span>
              <h2
                id="workflow-title"
                className="marketing-h2"
                style={{ marginTop: 8, maxWidth: 720 }}
              >
                From enrollment to the classroom to the family follow-up.
              </h2>
            </div>
            <div style={responsiveGridStyle}>
              {WORKFLOW.map((step, index) => (
                <article key={step.title} style={previewPanelStyle}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 16,
                      marginBottom: 18,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--accent-soft)',
                        color: 'var(--accent)',
                      }}
                    >
                      <Icon name={step.icon} size={21} />
                    </span>
                    <span className="text-label" aria-hidden="true">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 19, margin: '0 0 8px' }}>{step.title}</h3>
                  <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="tour"
          style={{ padding: '88px 0', background: 'var(--bg-warm)' }}
          aria-labelledby="tour-title"
        >
          <div className="container" style={{ maxWidth: 1120 }}>
            <div style={{ maxWidth: 720, marginBottom: 34 }}>
              <span className="text-label">Three product perspectives</span>
              <h2 id="tour-title" className="marketing-h2" style={{ margin: '8px 0 12px' }}>
                The right information for every role.
              </h2>
              <p style={{ color: 'var(--muted)', lineHeight: 1.65, fontSize: 16, margin: 0 }}>
                Each panel is a visual preview, not a live account. Names and class details are
                intentionally generic and fictional.
              </p>
            </div>

            <div style={responsiveGridStyle}>
              <PreviewPanel
                icon="principal"
                title="Principal / Admin"
                description="A calm operational view of the school."
              >
                <OperationsPreview />
              </PreviewPanel>

              <PreviewPanel
                icon="teacher"
                title="Teacher"
                description="A focused wrap-up for the work that happened in class."
              >
                <AttendanceCard status="present" time="9:05 AM" />
                <QuranProgressPreview />
                <HomeworkCard title="Review today’s assigned ayat with a parent" due="Next class" />
              </PreviewPanel>

              <PreviewPanel
                icon="parent"
                title="Parent"
                description="A clear family update without the administrative noise."
              >
                <AttendanceCard status="present" time="9:05 AM" />
                <PraiseCard
                  category="Effort"
                  note="Your student stayed focused during today’s Quran practice."
                  teacher="Sample Teacher"
                />
                <HomeworkCard
                  title="Continue the assigned Quran practice at home"
                  due="Before next class"
                />
                <TuitionReminderPreview />
              </PreviewPanel>
            </div>
          </div>
        </section>

        <section style={{ padding: '88px 0' }} aria-labelledby="availability-title">
          <div className="container" style={{ maxWidth: 1120 }}>
            <div style={{ maxWidth: 760, marginBottom: 34 }}>
              <span className="text-label">Honest product status</span>
              <h2 id="availability-title" className="marketing-h2" style={{ margin: '8px 0 12px' }}>
                What schools can use now—and what comes next.
              </h2>
              <p style={{ color: 'var(--muted)', lineHeight: 1.65, fontSize: 16, margin: 0 }}>
                The tour separates available functionality from upcoming work so every conversation
                starts with clear expectations.
              </p>
            </div>

            <div style={responsiveGridStyle}>
              <StatusColumn
                tone="available"
                title="Core school workflows"
                items={[
                  'Attendance and class wrap-up',
                  'Text-based Quran progress and milestones',
                  'Praise, notes, homework, and parent updates',
                  'In-app tuition reminders with a seven-day scheduled throttle',
                  'Leadership dashboard and roster import',
                  'Tuition tracking, Board Pack, and CSV exports',
                ]}
              />
              <StatusColumn
                tone="soon"
                title="Expanding the experience"
                items={['Full enrollment workflow']}
              />
              <StatusColumn
                tone="planned"
                title="Longer-term roadmap"
                items={[
                  'Single sign-on (SSO)',
                  'Offline class wrap-up support',
                  'SMS notifications',
                  'In-app family and staff messaging',
                  'Native mobile apps and additional languages',
                ]}
              />
            </div>
          </div>
        </section>

        <section style={{ padding: '0 0 104px' }} aria-labelledby="guided-demo-title">
          <div className="container" style={{ maxWidth: 1120 }}>
            <div
              style={{
                borderRadius: 22,
                background: 'var(--navy-fixed)',
                color: '#ffffff',
                padding: 'clamp(28px, 6vw, 56px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 28,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ maxWidth: 660 }}>
                <span className="text-label" style={{ color: 'inherit', opacity: 0.72 }}>
                  A closer look, safely
                </span>
                <h2
                  id="guided-demo-title"
                  style={{ fontSize: 'clamp(28px, 4vw, 44px)', margin: '10px 0 12px' }}
                >
                  See Talibly around your school’s workflow.
                </h2>
                <p style={{ margin: 0, opacity: 0.76, lineHeight: 1.65 }}>
                  School prospects can request a guided walkthrough. Recruiters and hiring managers
                  can use this tour to understand the product without shared credentials or private
                  data.
                </p>
              </div>
              <Link className="btn btn-accent" href="/contact">
                Request a guided demo
                <Icon name="arrow" size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
