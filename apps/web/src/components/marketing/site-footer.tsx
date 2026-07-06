import Link from 'next/link';
import { TaliblyLogo, LogoTagline } from '@/components/ui/logo';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link className="nav-logo" href="/">
              <TaliblyLogo iconSize={28} />
            </Link>
            <LogoTagline className="footer-tagline" />
            <p className="footer-blurb">
              Parent-first school management for North American Islamic schools, full-time
              academies, and Quran tutors.
            </p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <Link href="/for-parents">Parent app</Link>
            <Link href="/for-teachers">Teacher app</Link>
            <Link href="/for-principals">Principal dashboard</Link>
          </div>
          <div className="footer-col">
            <h5>Company</h5>
            <Link href="/pricing">Pricing</Link>
            <Link href="/contact">Book a demo</Link>
            <Link href="/security">Security</Link>
          </div>
          <div className="footer-col">
            <h5>Resources</h5>
            <Link href="/demo">Try the demo</Link>
            <Link href="/quick-start">Quick start</Link>
            <Link href="/known-limitations">Known limitations</Link>
          </div>
          <div className="footer-col">
            <h5>Legal</h5>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
        <div className="footer-base">
          <span>© 2026 Talibly · Made for the ummah</span>
          <a href="mailto:info@talibly.com" style={{ color: 'inherit', textDecoration: 'none' }}>info@talibly.com</a>
        </div>
      </div>
    </footer>
  );
}
