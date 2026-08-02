import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteNav } from '@/components/marketing/site-nav';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Privacy — Talibly',
  description: 'What Talibly currently stores, why it is used, and the limits of the preview.',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.75 }}>{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main style={{ padding: '80px 0 120px' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <span className="eyebrow" style={{ marginBottom: 12, display: 'inline-flex' }}>
            <span className="dot" aria-hidden="true" />
            Privacy
          </span>
          <h1 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Privacy notice
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 48 }}>
            Last updated: August 2, 2026
          </p>

          <Section title="Current product status">
            <p>
              Talibly is an early-stage school-management product. The public product tour uses
              fictional sample information and does not provide a shared login. A school should not
              enter real student information until its pilot scope, consent process, retention
              expectations, and data agreement have been reviewed.
            </p>
          </Section>

          <Section title="Information the application can store">
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
              <li>
                <strong>Account profiles:</strong> name, email, optional phone and avatar, role,
                organization membership, and notification preferences. Supabase Auth manages
                credentials and sessions.
              </li>
              <li>
                <strong>Student records:</strong> name, date of birth, enrollment, attendance,
                Quran/Hifz progress, notes, guardian relationships, and optional medical or
                emergency information entered by the school.
              </li>
              <li>
                <strong>School operations:</strong> classes, homework, announcements, trials,
                activity history, tuition plans, payment status, and Stripe reference identifiers.
              </li>
              <li>
                <strong>Optional audio:</strong> Hifz recordings when the storage feature is
                enabled. The complete consent workflow is unfinished, so real student audio should
                not be used in the current preview/pilot configuration.
              </li>
              <li>
                <strong>Contact requests:</strong> the school and contact details submitted through
                the public contact form.
              </li>
              <li>
                <strong>Technical records:</strong> hosting and server logs used for operation,
                debugging, and security.
              </li>
            </ul>
          </Section>

          <Section title="How information is used">
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
              <li>Provide role-based school, classroom, parent, and tuition workflows.</li>
              <li>Authenticate users and enforce organization/relationship access.</li>
              <li>
                Create in-app notifications and, when configured, send transactional email through
                Resend.
              </li>
              <li>Process school tuition through Stripe’s hosted test/pre-launch workflow.</li>
              <li>Respond to guided-demo, support, and security inquiries.</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              Talibly does not sell personal information and does not use student information for
              advertising.
            </p>
          </Section>

          <Section title="Service providers">
            <p>
              The current application uses Supabase for database, authentication, and storage;
              Vercel for hosting and server execution; Stripe for the school-tuition test/pre-launch
              flow; and Resend for transactional email when configured. Each provider processes
              information under its own terms and privacy practices.
            </p>
          </Section>

          <Section title="Children’s and education information">
            <p>
              Schools control the student information they enter and the people they invite. Talibly
              does not currently offer independent accounts for children under 13. Talibly has not
              completed a formal FERPA/COPPA compliance program or production school data agreement;
              the product should not be represented as certified or fully compliant.
            </p>
          </Section>

          <Section title="Access controls">
            <p>
              Row Level Security is enabled on every Talibly table in the Supabase public schema,
              anonymous table access is revoked, and authenticated policies use organization,
              teacher-assignment, and guardian-link relationships. The server also checks sessions,
              roles, and organization ownership because its privileged database connection bypasses
              RLS. See the{' '}
              <a href="/security" style={{ color: 'var(--accent)' }}>
                Security page
              </a>{' '}
              for current details and limits.
            </p>
          </Section>

          <Section title="Retention and deletion">
            <p>
              Talibly does not yet have an automated retention or account-cancellation deletion
              workflow. Records remain until an authorized administrator or operator removes them.
              Any real pilot must define retention and deletion expectations in writing before
              student information is entered.
            </p>
          </Section>

          <Section title="Access, correction, and export requests">
            <p>
              Admins can correct many school records in the dashboard and export selected student,
              attendance, payment, and Hifz data as CSV. Full self-service data export and deletion
              are not implemented. Requests should be sent to the school administrator and{' '}
              <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>
                info@talibly.com
              </a>
              ; fulfillment is currently manual and subject to identity/authority verification.
            </p>
          </Section>

          <Section title="Changes and contact">
            <p>
              This page will be updated when the implementation or operating practices change. For
              privacy questions, email{' '}
              <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>
                info@talibly.com
              </a>{' '}
              or use the{' '}
              <a href="/contact" style={{ color: 'var(--accent)' }}>
                contact form
              </a>
              . Do not include real student records in the initial message.
            </p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
