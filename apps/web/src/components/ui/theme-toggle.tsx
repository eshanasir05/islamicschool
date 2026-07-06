'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/marketing/icon';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('talibly-theme', theme);
  } catch {
    // localStorage can throw in private-browsing edge cases — theme just
    // won't persist across reloads, which is a harmless degradation.
  }
}

/**
 * Segmented light/dark control. Reads the real value from the DOM on mount
 * (set synchronously by the no-flash bootstrap script in the root layout)
 * rather than guessing, so it never has to re-render into a different
 * state right after paint.
 */
export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setTheme(current);
  }, []);

  if (!theme) return null;

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  if (compact) {
    const next = theme === 'dark' ? 'light' : 'dark';
    return (
      <button
        type="button"
        className={`theme-toggle-compact ${className ?? ''}`}
        onClick={() => choose(next)}
        aria-label={`Switch to ${next} mode`}
        title={`Switch to ${next} mode`}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      </button>
    );
  }

  return (
    <div className={`theme-toggle ${className ?? ''}`} role="group" aria-label="Color theme">
      <button
        type="button"
        className={`theme-toggle-btn${theme === 'light' ? ' is-active' : ''}`}
        onClick={() => choose('light')}
        aria-pressed={theme === 'light'}
      >
        <Icon name="sun" size={14} /> Light
      </button>
      <button
        type="button"
        className={`theme-toggle-btn${theme === 'dark' ? ' is-active' : ''}`}
        onClick={() => choose('dark')}
        aria-pressed={theme === 'dark'}
      >
        <Icon name="moon" size={14} /> Dark
      </button>
    </div>
  );
}
