import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="sign-in-page">
      <div className="sign-in-card" style={{ textAlign: 'center' }}>
        <div className="sign-in-logo"><span className="mark">T</span><span>talibly</span></div>
        <h1 className="sign-in-title" style={{ fontSize: 48, marginBottom: 8 }}>404</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
          This page doesn't exist or has been moved.
        </p>
        <Link href="/" className="btn btn-accent">
          Back to home
        </Link>
      </div>
    </div>
  );
}
