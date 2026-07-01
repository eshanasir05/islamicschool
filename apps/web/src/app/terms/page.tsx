import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Talibly',
  description: 'Terms governing use of the Talibly school management platform.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>{title}</h2>
      <div style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.75 }}>{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <SiteNav />
      <main style={{ padding: '80px 0 120px' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <span className="eyebrow" style={{ marginBottom: 12, display: 'inline-flex' }}>
            <span className="dot" />Legal
          </span>
          <h1 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>Terms of Service</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 48 }}>Last updated: June 2026</p>

          <Section title="Acceptance of terms">
            <p>
              By accessing or using Talibly (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.
            </p>
          </Section>

          <Section title="Description of service">
            <p>
              Talibly is a school management platform for Islamic schools, full-time academies, and Quran tutors. The Service includes attendance tracking, hifz progress recording, parent communications, and tuition management. Features may change over time; we will notify administrators of significant changes.
            </p>
          </Section>

          <Section title="Accounts and access">
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Each school ("Organization") has one or more administrators who manage teacher, parent, and student accounts.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.</li>
              <li>You must notify us promptly at <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>info@talibly.com</a> if you believe your account has been compromised.</li>
              <li>You may not share credentials between individuals or create accounts on behalf of people who have not consented.</li>
            </ul>
          </Section>

          <Section title="Acceptable use">
            <p style={{ marginBottom: 12 }}>You agree not to:</p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Use the Service in any way that violates applicable law, including privacy laws relating to student data.</li>
              <li>Upload content that is harmful, unlawful, or infringes third-party rights.</li>
              <li>Attempt to gain unauthorized access to other accounts or systems.</li>
              <li>Reverse-engineer, scrape, or resell the Service without written permission.</li>
            </ul>
          </Section>

          <Section title="Data and privacy">
            <p>
              Your use of the Service is also governed by our <a href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</a>. Schools are the data controllers for student information entered into the Service. Talibly acts as a service provider and processes that data only as directed by the school.
            </p>
          </Section>

          <Section title="Payment and billing">
            <p>
              Paid plans are billed monthly or annually via Stripe. Prices are listed on our <a href="/pricing" style={{ color: 'var(--accent)' }}>Pricing page</a>. We reserve the right to change pricing with 30 days' written notice to existing subscribers. Standard Stripe processing fees apply to tuition payments collected through the Service. Talibly does not take an additional percentage of tuition payments.
            </p>
            <p style={{ marginTop: 12 }}>
              If you cancel your subscription, your account remains active until the end of the current billing period. We do not offer prorated refunds for unused time within a billing period.
            </p>
          </Section>

          <Section title="Service availability">
            <p>
              We aim to keep the Service available and reliable, but we do not guarantee uninterrupted uptime. Scheduled maintenance will be communicated in advance when possible. We are not liable for downtime caused by factors outside our control, including third-party infrastructure providers.
            </p>
          </Section>

          <Section title="Intellectual property">
            <p>
              Talibly and its content, features, and functionality are owned by us and are protected by applicable intellectual property law. You retain ownership of all data you input into the Service. By using the Service, you grant us a limited license to process your data solely to provide the Service.
            </p>
          </Section>

          <Section title="Termination">
            <p>
              Either party may terminate the agreement at any time. On termination, we will retain your data for 30 days to allow export, after which it will be permanently deleted. You can export your data as CSV from the admin dashboard at any time.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              To the maximum extent permitted by applicable law, Talibly is not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability to you for any claim arising from these Terms will not exceed the amount you paid us in the 12 months before the claim arose.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              We may update these Terms from time to time. We will notify administrators by email at least 14 days before material changes take effect. Continued use of the Service after that date constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              These Terms are governed by the laws of the United States, without regard to conflict of law principles. Disputes will be resolved in the courts of the United States.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these Terms: <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>info@talibly.com</a><br />
              General inquiries: <a href="/contact" style={{ color: 'var(--accent)' }}>Contact form</a>
            </p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
