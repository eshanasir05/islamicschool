import Link from 'next/link';
import { Fragment } from 'react';

type Crumb = { label: string; href?: string };

/**
 * Admin breadcrumb trail. The last item is rendered as the current page
 * (no link). Use on detail/edit pages so admins never lose their place.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {item.href && !isLast ? (
              <Link href={item.href} className="breadcrumb-link">
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumb-current" aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            )}
            {!isLast && <span className="breadcrumb-sep" aria-hidden="true">›</span>}
          </Fragment>
        );
      })}
    </nav>
  );
}
