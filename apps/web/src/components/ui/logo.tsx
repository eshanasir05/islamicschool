type LogoMarkProps = { size?: number; className?: string };

/**
 * Inline SVG so it's crisp at any size with no extra network request. The
 * gradient id is static and duplicated when multiple marks render on one
 * page (e.g. header + footer) — harmless since every instance defines the
 * identical gradient.
 */
export function LogoMark({ size = 26, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        {/* All three stops track theme-aware tokens: var(--fg) (navy on
            light, near-white on dark) so the mark keeps contrast against its
            background in both themes, and --logo-mid/--logo-end because the
            light-mode teal shades are dark enough to read as a muddy patch
            against a dark background otherwise. */}
        <linearGradient id="logo-stem-gradient" x1="32" y1="9" x2="32" y2="51" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--fg)' }} />
          <stop offset="0.35" style={{ stopColor: 'var(--logo-mid)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-end)' }} />
        </linearGradient>
      </defs>
      <rect x="8" y="9" width="48" height="13" rx="6.5" style={{ fill: 'var(--fg)' }} />
      <rect x="24.5" y="9" width="15" height="42" rx="7" fill="url(#logo-stem-gradient)" />
      <g transform="translate(32,46) rotate(-40)">
        <path d="M0 -13 C7 -6.5 7 6.5 0 13 C-7 6.5 -7 -6.5 0 -13 Z" fill="#5eead4" />
      </g>
    </svg>
  );
}

/** Small letter-spaced tagline for full brand lockups (footer, marketing).
 * Not meant for the compact navbar/app-header lockup — keep those uncrowded. */
export function LogoTagline({ className }: { className?: string }) {
  return <span className={`brand-tagline ${className ?? ''}`}>For the ummah</span>;
}

/**
 * Icon + "alibly" — the mark's own T stroke reads as the missing first
 * letter, so the wordmark never repeats it (icon + "talibly" would read as
 * a duplicated T). Drop this inside any element that previously rendered
 * `<LogoMark /> talibly` as direct children (e.g. a flex `Link`).
 */
export function TaliblyLogo({ iconSize = 26 }: { iconSize?: number }) {
  return (
    <>
      <LogoMark size={iconSize} />
      <span className="logo-word">alibly</span>
    </>
  );
}
