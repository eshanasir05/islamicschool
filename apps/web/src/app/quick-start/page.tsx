import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quick Start — Talibly',
  description: 'A short getting-started guide for admins, teachers, and parents using Talibly.',
};

function Section({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>{title}</h2>
      <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.7 }}>
        {steps.map(s => <li key={s}>{s}</li>)}
      </ol>
    </section>
  );
}

export default function QuickStartPage() {
  return (
    <>
      <SiteNav />
      <main style={{ padding: '80px 0 120px' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <span className="eyebrow" style={{ marginBottom: 12, display: 'inline-flex' }}>
            <span className="dot" />Quick start
          </span>
          <h1 className="marketing-h1" style={{ marginBottom: 8 }}>
            Get going in a few minutes.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 48 }}>
            Pick your role below. Each guide reflects exactly what&apos;s in the product today — no steps for features that don&apos;t exist yet.
          </p>

          <Section
            title="Admin / Principal"
            steps={[
              'Sign in and open the Getting Started checklist on your dashboard — it links to every setup step in order.',
              'Add your school profile (name and address) under Settings.',
              'Create your classes and assign a teacher to each one.',
              'Add students one at a time, or import a roster via CSV under Import.',
              'Link each student to their parent/guardian from the student\'s page.',
              'Create a tuition plan for each enrolled student, applying sibling discounts or tuition assistance where needed.',
              'Post your first school-wide announcement so parents see it in their feed.',
              'Invite parents so they can sign in and see their child\'s daily activity.',
              'Check the Board Pack for a one-glance summary you can share with your board.',
              'Review the Activity Log any time you want to see who did what, and when.',
            ]}
          />

          <Section
            title="Teacher"
            steps={[
              'Sign in — you\'ll see the classes you\'ve been assigned to on your dashboard.',
              'Open a class and mark attendance for the day with one tap per student.',
              'Record hifz progress (surah, ayah range, and an optional voice recording) for each student.',
              'Add notes — praise, homework, or a concern — that parents see immediately in their feed.',
              'Assign homework with a due date; it shows up for every enrolled student\'s parent.',
              'Log a hifz milestone (like completing a juz) when a student reaches one.',
              'If you have a trial/placement student, complete their assessment once you\'ve observed them.',
              'Tap "Wrap up" at the end of a session to notify parents their child\'s day is ready to view.',
            ]}
          />

          <Section
            title="Parent"
            steps={[
              'Sign in — if you have more than one child enrolled, switch between them using the tabs at the top.',
              'Check your child\'s daily feed for today\'s attendance, hifz progress, and any teacher notes.',
              'If your child was marked absent, tap in to let the school know why.',
              'Read your child\'s Adab Growth Journal to see praise notes over time.',
              'View your tuition plan and payment history, and pay or update billing directly from the portal.',
              'Read school-wide announcements as they\'re posted.',
              'If you have more than one child, use the Household view to see everyone at a glance.',
            ]}
          />

          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 32 }}>
            Questions? Email <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>info@talibly.com</a> — see also our <a href="/known-limitations" style={{ color: 'var(--accent)' }}>known limitations</a> page for what Talibly doesn&apos;t do yet.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
