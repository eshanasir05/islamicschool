import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Talibly',
  description: 'How Talibly collects, uses, and protects data for Islamic schools and families.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>{title}</h2>
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
            <span className="dot" />Legal
          </span>
          <h1 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 48 }}>Last updated: June 2026</p>

          <Section title="Who we are">
            <p>
              Talibly is a school management platform built for North American Islamic weekend schools, full-time academies, and Quran tutors. We are incorporated in the United States. Our primary contact for privacy matters is <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>info@talibly.com</a>.
            </p>
          </Section>

          <Section title="What data we collect">
            <p style={{ marginBottom: 12 }}>We collect only what is necessary to deliver the service:</p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><strong>Account data</strong> — name, email address, and password (hashed by Supabase Auth; we never see plaintext passwords).</li>
              <li><strong>Student records</strong> — full name, date of birth, gender (optional), class enrollment, attendance status, hifz progress, teacher notes, and medical notes if provided by the school.</li>
              <li><strong>Audio recordings</strong> — hifz recitations recorded by teachers. Stored in Supabase Storage, accessible only to the student's guardians and school staff.</li>
              <li><strong>Payment data</strong> — tuition plan amounts, payment status, and Stripe payment IDs. We do not store raw card numbers. All payment processing is handled by Stripe (PCI DSS Level 1 certified).</li>
              <li><strong>Usage data</strong> — server access logs for security and debugging. We do not run third-party analytics scripts.</li>
              <li><strong>Contact form submissions</strong> — school name, contact details, and message when you request a demo.</li>
            </ul>
          </Section>

          <Section title="How we use your data">
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Provide the Talibly service to your school, teachers, and parents.</li>
              <li>Send transactional emails (parent class summaries, password resets, billing receipts) via Resend.</li>
              <li>Process tuition payments through Stripe.</li>
              <li>Respond to support requests and demo inquiries.</li>
              <li>Improve the service based on aggregate, non-identifiable usage patterns.</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              We do not sell your data. We do not use student data for advertising. We do not share personal data with third parties except as described below.
            </p>
          </Section>

          <Section title="Third-party services">
            <p>Talibly uses the following sub-processors:</p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><strong>Supabase</strong> (database, authentication, file storage) — hosted on AWS infrastructure in the United States.</li>
              <li><strong>Vercel</strong> (web hosting and edge delivery) — infrastructure in the United States.</li>
              <li><strong>Stripe</strong> (payment processing) — PCI DSS Level 1. Stripe's privacy policy governs payment card data.</li>
              <li><strong>Resend</strong> (transactional email) — emails sent to parents and staff.</li>
            </ul>
          </Section>

          <Section title="Data related to children (COPPA / FERPA)">
            <p>
              Student records held in Talibly are education records under FERPA. Schools are the data controllers for student information; Talibly acts as a service provider (operator) under COPPA where applicable.
            </p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <li>Schools control who has access to student records.</li>
              <li>Parents may request to review, correct, or delete their child's records by contacting the school administrator, who can action the request in the Talibly dashboard.</li>
              <li>We do not permit children under 13 to create independent accounts.</li>
            </ul>
          </Section>

          <Section title="Data retention">
            <p>
              Active school accounts retain data for the duration of the subscription. On cancellation, data is retained for 30 days to allow export, then deleted from production systems. Audio recordings are deleted on the same schedule. Stripe retains payment records independently per their policies.
            </p>
          </Section>

          <Section title="Your rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Export your data in a portable format (CSV export is available in the admin dashboard).</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              To exercise these rights, contact <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>info@talibly.com</a>.
            </p>
          </Section>

          <Section title="Security">
            <p>
              All data is transmitted over TLS. Data at rest is encrypted by Supabase. We use Supabase Row Level Security (RLS) to enforce access controls at the database level. See our <a href="/security" style={{ color: 'var(--accent)' }}>Security page</a> for more detail.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We will notify school administrators by email of material changes to this policy at least 14 days before they take effect. Continued use of the service after that date constitutes acceptance.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Privacy questions: <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>info@talibly.com</a><br />
              General inquiries: <a href="/contact" style={{ color: 'var(--accent)' }}>Contact form</a>
            </p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
