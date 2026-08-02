import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteNav } from '@/components/marketing/site-nav';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Security — Talibly',
  description: 'The security controls currently implemented in Talibly and the remaining gaps.',
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

export default function SecurityPage() {
  return (
    <>
      <SiteNav />
      <main style={{ padding: '80px 0 120px' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <span className="eyebrow" style={{ marginBottom: 12, display: 'inline-flex' }}>
            <span className="dot" aria-hidden="true" />
            Security
          </span>
          <h1 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Talibly’s current security posture.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 16 }}>
            This page describes controls that are implemented now, along with important limits. It
            is not a certification or a promise about unfinished work.
          </p>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 48 }}>
            Implementation snapshot: August 2, 2026
          </p>

          <Section title="Controls in place">
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
              <li>
                <strong>Encrypted transport:</strong> the production application is delivered over
                HTTPS by Vercel, and connections to Supabase and Stripe use encrypted transport.
              </li>
              <li>
                <strong>Authentication:</strong> Supabase Auth manages account credentials and
                sessions. Talibly’s application database and repository do not store plaintext user
                passwords.
              </li>
              <li>
                <strong>Database RLS:</strong> Row Level Security is enabled on every Talibly table
                in the Supabase public schema. Anonymous table grants are revoked. Authenticated
                policies use active organization membership, assigned-teacher relationships, and
                linked-guardian relationships.
              </li>
              <li>
                <strong>Server authorization:</strong> protected routes validate the Supabase
                session and organization membership. Sensitive server actions also check the
                caller’s role and scope records to the configured organization.
              </li>
              <li>
                <strong>Webhook integrity:</strong> Stripe webhook signatures are verified. A
                durable event ledger and unique payment-intent index prevent the same successful
                payment event from being applied twice.
              </li>
              <li>
                <strong>Payment cards:</strong> raw card details are entered on Stripe-hosted pages
                and are not stored in Talibly’s database.
              </li>
            </ul>
          </Section>

          <Section title="How organization access works today">
            <p>
              The current deployment is configured for one school organization through an
              environment setting; school switching is not implemented. Within that organization,
              principals and admins manage school records, teachers are scoped to assigned classes,
              and parents are scoped to linked students.
            </p>
            <p style={{ marginTop: 12 }}>
              Talibly’s server uses a privileged database connection for server actions and route
              handlers. That connection bypasses RLS by design, so application-level authentication
              and organization filters remain essential. RLS is an additional boundary, not a
              substitute for those checks.
            </p>
          </Section>

          <Section title="Files and audio">
            <p>
              The Hifz audio bucket is private and playback uses short-lived signed URLs. The full
              guardian consent and revocation workflow is not finished. Real student audio should
              not be uploaded in the current preview or pilot configuration until that workflow and
              the school’s consent process have been reviewed.
            </p>
          </Section>

          <Section title="Infrastructure providers">
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
              <li>
                <strong>Supabase:</strong> PostgreSQL, authentication, and file storage.
              </li>
              <li>
                <strong>Vercel:</strong> web hosting, server execution, and delivery logs.
              </li>
              <li>
                <strong>Stripe:</strong> the test/pre-launch school-tuition workflow. Talibly SaaS
                subscriptions are not currently sold through Stripe.
              </li>
              <li>
                <strong>Resend:</strong> transactional email when valid email configuration is
                present. In-app notifications do not prove that an email was delivered.
              </li>
            </ul>
          </Section>

          <Section title="Known security and compliance limits">
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
              <li>Talibly has not completed an independent penetration test or SOC 2 audit.</li>
              <li>
                Formal school data-processing agreements and a complete FERPA/COPPA compliance
                program are not yet implemented.
              </li>
              <li>Automated retention, deletion, and legal-hold workflows are not implemented.</li>
              <li>
                Multi-organization switching and production-grade Stripe Connect payouts are not
                implemented.
              </li>
            </ul>
          </Section>

          <Section title="Report a security issue">
            <p>
              Send security reports to{' '}
              <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>
                info@talibly.com
              </a>
              . Please avoid including real student information in the initial message. Talibly will
              review the report and respond as capacity allows; no fixed response-time SLA is
              currently offered.
            </p>
          </Section>

          <Section title="Questions">
            <p>
              For school security questions, use the{' '}
              <a href="/contact" style={{ color: 'var(--accent)' }}>
                contact form
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
