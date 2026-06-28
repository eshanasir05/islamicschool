import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link className="nav-logo" href="/">
              <span className="mark">S</span>
              talibly
            </Link>
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
            <Link href="/pricing">Pricing</Link>
          </div>
          <div className="footer-col">
            <h5>For schools</h5>
            <Link href="/pricing">Weekend schools</Link>
            <Link href="/pricing">Full-time academies</Link>
            <Link href="/contact">Quran tutors</Link>
            <Link href="/contact">Migration help</Link>
          </div>
          <div className="footer-col">
            <h5>Company</h5>
            <Link href="/contact">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/security">Security</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
        <div className="footer-base">
          <span>© 2026 Talibly · Made for the ummah</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            <Link href="/privacy" style={{ color: 'inherit' }}>Privacy</Link>
            {' · '}
            <Link href="/terms" style={{ color: 'inherit' }}>Terms</Link>
            {' · '}
            <Link href="/security" style={{ color: 'inherit' }}>Security</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
