import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo Access — Talibly',
  description: 'Try Talibly with sample school data. Demo credentials for reviewers and evaluators.',
};

function Cred({ label, emails }: { label: string; emails: string[] }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="text-label" style={{ marginBottom: 6 }}>
        {label}
      </div>
      {emails.map((e, i) => (
        <div
          key={e}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg)', padding: '6px 0',
            borderBottom: i < emails.length - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          {e}
        </div>
      ))}
    </div>
  );
}

export default function DemoPage() {
  return (
    <>
      <SiteNav />
      <main style={{ minHeight: '80vh', padding: '80px 0 120px' }}>
        <div className="container" style={{ maxWidth: 560 }}>
          <span className="eyebrow" style={{ marginBottom: 12, display: 'inline-flex' }}>
            <span className="dot" />
            Demo environment
          </span>
          <h1 className="marketing-h1" style={{ marginBottom: 12 }}>
            Try Talibly with sample data.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 48 }}>
            The demo runs on real infrastructure with a seeded school — Masjid Al-Noor Sunday School. You can sign in as any role using the credentials below. All data is sample data; no real students or payments are involved.
          </p>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '28px 28px 12px' }}>
            <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Password for all accounts</div>
              <code style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fg)', letterSpacing: '0.05em' }}>
                demo1234
              </code>
            </div>

            <Cred label="Teacher" emails={['amina@talibly.dev', 'idris@talibly.dev']} />
            <Cred label="Parent" emails={['sarah@talibly.dev', 'omar@talibly.dev']} />
            <Cred label="Principal / Admin" emails={['khalid@talibly.dev']} />
          </div>

          <div className="banner banner-warn" style={{ marginTop: 32 }}>
            <strong>Note:</strong> This demo environment is provided for evaluators, portfolio reviewers, and prospective customers. Magic link sign-in requires Supabase SMTP configuration — use password sign-in. Demo data may be reset without notice, so don&apos;t rely on anything you enter here being permanent.
          </div>

          <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
              Ready to set up Talibly for your real school?
            </p>
            <a href="/contact" className="btn btn-accent">
              Book a demo →
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
