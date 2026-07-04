import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Known Limitations — Talibly',
  description: 'An honest list of what Talibly does not do yet.',
};

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export default function KnownLimitationsPage() {
  return (
    <>
      <SiteNav />
      <main style={{ padding: '80px 0 120px' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <span className="eyebrow" style={{ marginBottom: 12, display: 'inline-flex' }}>
            <span className="dot" />Known limitations
          </span>
          <h1 className="marketing-h1" style={{ marginBottom: 8 }}>
            What Talibly doesn&apos;t do yet.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 40 }}>
            These are intentional trade-offs for the current stage of the product, not bugs. If any of these matter for your school, email us at <a href="mailto:info@talibly.com" style={{ color: 'var(--accent)' }}>info@talibly.com</a> before starting a pilot.
          </p>

          <Item title="One school per deployment">
            Talibly currently runs as a single organization per deployment. Supporting multiple schools from one deployment (multi-tenancy with org switching) is a planned next step, not something available today.
          </Item>
          <Item title="No SMS or push notifications">
            Parent notifications (wrap-up summaries, announcements, payment alerts) are sent by email via Resend. Text messages and mobile push notifications are not wired up.
          </Item>
          <Item title="No native mobile app">
            Talibly is a responsive web app that works well on phones, but there is no iOS or Android app to install.
          </Item>
          <Item title="No Stripe Connect / sub-accounts">
            All tuition payments go through a single platform Stripe account. Each school does not have its own separate Stripe account.
          </Item>
          <Item title="Hifz audio requires storage configuration">
            Voice recordings for hifz sessions are optional and silently skipped if the underlying storage bucket isn&apos;t configured — it doesn&apos;t block attendance or hifz text entry.
          </Item>
          <Item title="No in-app messaging">
            The database has the groundwork for direct messaging, but there is no messaging UI yet. School-wide announcements are the only broadcast channel today.
          </Item>
          <Item title="CSV exports are not date-filtered">
            The CSV exports (roster, attendance, tuition, hifz) return the school&apos;s full history, not a selected date range.
          </Item>
          <Item title="Sibling discounts affect the charged total, not the receipt line items">
            When a sibling discount or tuition assistance is applied, the family is genuinely charged less — but the Stripe receipt shows the final total rather than a separate "discount" line.
          </Item>
          <Item title="Demo data can be reset without notice">
            The public demo environment may be wiped and reseeded at any time for evaluators and prospective customers. Nothing entered there is permanent.
          </Item>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
