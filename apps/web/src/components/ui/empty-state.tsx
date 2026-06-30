import Link from 'next/link';
import { Icon, type IconName } from '@/components/marketing/icon';

type Props = {
  icon?: IconName;
  title: string;
  body?: string;
  cta?: { label: string; href: string };
};

/**
 * Centered empty state for list/detail pages that have no data yet.
 * Replaces the bare `.feed-empty` blocks with a consistent, friendlier treatment.
 */
export function EmptyState({ icon = 'sparkle', title, body, cta }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {body && <p className="empty-state-body">{body}</p>}
      {cta && (
        <Link href={cta.href} className="btn btn-accent" style={{ marginTop: 16, textDecoration: 'none' }}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}
