import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security — Talibly',
  description: 'How Talibly protects school and student data.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>{title}</h2>
      <div style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.75 }}>{children}</div>
    </section>
  );
}

function Provider({ name, desc }: { name: string; desc: string }) {
  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 14, color: 'var(--fg-2)' }}>{desc}</div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <>
      <SiteNav />
      <main style={{ padding: '80px 0 120px' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <span className="eyebrow" style={{ marginBottom: 12, display: 'inline-flex' }}>
            <span className="dot" />Security
          </span>
          <h1 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
            How we protect your school's data.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 48 }}>
            Talibly handles attendance records, hifz progress, and tuition data for Islamic schools and families. We take that responsibility seriously.
          </p>

          <Section title="Encryption">
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><strong>In transit:</strong> All traffic between your browser and Talibly uses TLS 1.2 or higher. Connections that do not meet this standard are rejected.</li>
              <li><strong>At rest:</strong> Database storage is encrypted by Supabase at the infrastructure level using AES-256.</li>
              <li><strong>Passwords:</strong> User passwords are hashed by Supabase Auth using bcrypt. Talibly never sees or stores plaintext passwords.</li>
              <li><strong>Payment data:</strong> Card numbers are never stored in Talibly's database. All payment data is tokenized and stored by Stripe (PCI DSS Level 1).</li>
            </ul>
          </Section>

          <Section title="Access controls">
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><strong>Row Level Security (RLS):</strong> Supabase RLS policies enforce that each user can only read and write data belonging to their organization. These controls are applied at the database layer, not just the application layer.</li>
              <li><strong>Role-based access:</strong> Teachers, parents, and principals each have separate roles with separate permissions. A teacher cannot access another school's data. A parent can only view their own children's records.</li>
              <li><strong>Service role key:</strong> The Supabase service role key (used for admin operations) is never exposed to the browser. It is used server-side only, in server actions and route handlers.</li>
              <li><strong>Session expiry:</strong> Authentication tokens expire and are refreshed automatically. Idle sessions expire after the Supabase default period.</li>
            </ul>
          </Section>

          <Section title="Infrastructure">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Provider
                name="Supabase"
                desc="Database (PostgreSQL), authentication, and file storage. Hosted on AWS infrastructure in the United States. Supabase is SOC 2 Type II certified."
              />
              <Provider
                name="Vercel"
                desc="Web hosting and edge delivery. All application code runs on Vercel's infrastructure. Vercel is SOC 2 Type II certified."
              />
              <Provider
                name="Stripe"
                desc="Payment processing. PCI DSS Level 1 Service Provider — the highest level of PCI compliance. Talibly never handles raw card data."
              />
              <Provider
                name="Resend"
                desc="Transactional email (class summaries, password resets, billing notifications). Email content does not include sensitive financial data."
              />
            </div>
          </Section>

          <Section title="Data isolation">
            <p>
              Each school organization is a separate tenant. Data is separated at the application and database levels — a user authenticated to one school cannot read, write, or enumerate data belonging to another school. This is enforced by Supabase RLS policies on every table that contains school data.
            </p>
          </Section>

          <Section title="Student data">
            <p>
              Student records — names, attendance, hifz progress, and notes — are accessible only to:
            </p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <li>The school's administrators and teachers (within that school's tenant).</li>
              <li>The student's linked guardians (read-only, scoped to their child).</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              Hifz audio recordings are stored in Supabase Storage with access controlled by signed URLs. Only authenticated guardians of the specific student can generate a signed URL for that student's audio.
            </p>
          </Section>

          <Section title="Reporting a vulnerability">
            <p>
              If you discover a security issue, please email <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>info@talibly.com</a>. We will acknowledge your report within 2 business days and work to resolve confirmed issues promptly. We ask that you do not publicly disclose vulnerabilities until we have had a reasonable opportunity to address them.
            </p>
          </Section>

          <Section title="Questions">
            <p>
              Security questions: <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>info@talibly.com</a><br />
              General inquiries: <a href="/contact" style={{ color: 'var(--accent)' }}>Contact form</a>
            </p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
