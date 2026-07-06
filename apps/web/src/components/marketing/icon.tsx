import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'check'
  | 'arrow'
  | 'play'
  | 'pause'
  | 'cal'
  | 'mic'
  | 'phone'
  | 'apple'
  | 'android'
  | 'web'
  | 'parent'
  | 'teacher'
  | 'principal'
  | 'sparkle'
  | 'star'
  | 'shield'
  | 'money'
  | 'msg'
  | 'menu'
  | 'x'
  | 'paper'
  | 'whatsapp'
  | 'chevron-right'
  | 'edit'
  | 'trash'
  | 'download'
  | 'external-link'
  | 'search'
  | 'users'
  | 'plus'
  | 'home'
  | 'book'
  | 'settings'
  | 'chevron-down'
  | 'activity'
  | 'bell'
  | 'sun'
  | 'moon';

type Props = {
  name: IconName;
  size?: number;
} & Omit<SVGProps<SVGSVGElement>, 'name'>;

type Entry = { filled?: boolean; label: string; body: ReactNode };

const ICONS: Record<IconName, Entry> = {
  check: {
    label: 'Check',
    body: <polyline points="20 6 9 17 4 12" />,
  },
  arrow: {
    label: 'Arrow',
    body: (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </>
    ),
  },
  play: { filled: true, label: 'Play', body: <path d="M8 5v14l11-7z" /> },
  pause: {
    filled: true,
    label: 'Pause',
    body: (
      <>
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </>
    ),
  },
  cal: {
    label: 'Calendar',
    body: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
  },
  mic: {
    label: 'Microphone',
    body: (
      <>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
      </>
    ),
  },
  phone: {
    label: 'Phone',
    body: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </>
    ),
  },
  apple: {
    filled: true,
    label: 'Apple',
    body: (
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    ),
  },
  android: {
    label: 'Android',
    body: (
      <>
        <path d="M5 16V8a7 7 0 0 1 14 0v8" />
        <line x1="2" y1="16" x2="2" y2="20" />
        <line x1="22" y1="16" x2="22" y2="20" />
        <line x1="5" y1="20" x2="5" y2="22" />
        <line x1="19" y1="20" x2="19" y2="22" />
        <line x1="8" y1="6" x2="7" y2="4" />
        <line x1="16" y1="6" x2="17" y2="4" />
      </>
    ),
  },
  web: {
    label: 'Web',
    body: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </>
    ),
  },
  parent: {
    label: 'Parent',
    body: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  teacher: {
    label: 'Teacher',
    body: (
      <>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </>
    ),
  },
  principal: {
    label: 'Principal',
    body: (
      <>
        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
        <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
      </>
    ),
  },
  sparkle: {
    filled: true,
    label: 'Sparkle',
    body: <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />,
  },
  star: {
    filled: true,
    label: 'Star',
    body: (
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    ),
  },
  shield: {
    label: 'Shield',
    body: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  money: {
    label: 'Money',
    body: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  msg: {
    label: 'Message',
    body: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  },
  menu: {
    label: 'Menu',
    body: (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    ),
  },
  x: {
    label: 'Close',
    body: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
  },
  paper: {
    label: 'Document',
    body: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </>
    ),
  },
  whatsapp: {
    filled: true,
    label: 'WhatsApp',
    body: (
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.8-2.7-1.5-3.8-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5 0-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5-.2 0-.4 0-.6 0-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5 0 1.5 1 2.9 1.2 3.1.1.2 2 3.2 5 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 2-1.4.3-.7.3-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" />
    ),
  },
  'chevron-right': {
    label: 'Chevron right',
    body: <polyline points="9 18 15 12 9 6" />,
  },
  edit: {
    label: 'Edit',
    body: (
      <>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
      </>
    ),
  },
  trash: {
    label: 'Delete',
    body: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </>
    ),
  },
  download: {
    label: 'Download',
    body: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
  },
  'external-link': {
    label: 'External link',
    body: (
      <>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </>
    ),
  },
  search: {
    label: 'Search',
    body: (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
  },
  users: {
    label: 'People',
    body: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  plus: {
    label: 'Add',
    body: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
  },
  home: {
    label: 'Home',
    body: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
  book: {
    label: 'Book',
    body: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </>
    ),
  },
  settings: {
    label: 'Settings',
    body: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  },
  'chevron-down': {
    label: 'Expand',
    body: <polyline points="6 9 12 15 18 9" />,
  },
  activity: {
    label: 'Activity',
    body: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  },
  bell: {
    label: 'Notifications',
    body: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
  },
  sun: {
    label: 'Light mode',
    body: (
      <>
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </>
    ),
  },
  moon: {
    label: 'Dark mode',
    body: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  },
};

export function Icon({ name, size = 16, ...rest }: Props) {
  const entry = ICONS[name];
  if (!entry) return null;
  const strokeProps = entry.filled
    ? { fill: 'currentColor' as const }
    : {
        fill: 'none' as const,
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
      };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={entry.label}
      focusable={false}
      {...strokeProps}
      {...rest}
    >
      <title>{entry.label}</title>
      {entry.body}
    </svg>
  );
}
