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
            <a href="/#weekend-schools">Weekend schools</a>
            <a href="/#full-time">Full-time academies</a>
            <a href="/#tutors">Quran tutors</a>
            <a href="/#migration">Migration</a>
          </div>
          <div className="footer-col">
            <h5>Company</h5>
            <a href="/#about">About</a>
            <a href="/#contact">Contact</a>
            <a href="/#privacy">Privacy</a>
            <a href="/#terms">Terms</a>
          </div>
        </div>
        <div className="footer-base">
          <span>© 2026 Talibly · Made for the ummah</span>
          <span>v1 · in development</span>
        </div>
      </div>
    </footer>
  );
}
