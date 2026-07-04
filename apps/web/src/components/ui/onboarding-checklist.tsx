'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/marketing/icon';
import type { OnboardingItem } from '@/app/(admin)/actions';
import { dismissOnboardingChecklist } from '@/app/(admin)/actions';

type Props = {
  items: OnboardingItem[];
};

export function OnboardingChecklist({ items }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);

  const doneCount = items.filter(i => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  if (hidden) return null;

  return (
    <div className="onboarding-card">
      <button type="button" className="onboarding-header" onClick={() => setCollapsed(c => !c)}>
        <div className="onboarding-header-left">
          <span className="onboarding-title">Getting started</span>
          <div className="onboarding-progress-track">
            <div className="onboarding-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="onboarding-progress-label">{doneCount} of {items.length} done</span>
        </div>
        <Icon name={collapsed ? 'chevron-right' : 'chevron-down'} size={16} />
      </button>

      {!collapsed && (
        <>
          <div className="onboarding-list">
            {items.map(item => (
              <Link key={item.key} href={item.href} className={`onboarding-item ${item.done ? 'is-done' : ''}`}>
                <span className={`onboarding-item-check ${item.done ? 'is-done' : ''}`}>
                  <Icon name="check" size={12} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="onboarding-item-label" style={{ display: 'block' }}>{item.label}</span>
                  <span className="onboarding-item-sub">{item.sub}</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="onboarding-dismiss-row">
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '5px 10px' }}
              disabled={isPending}
              onClick={() => startTransition(async () => {
                await dismissOnboardingChecklist();
                setHidden(true);
              })}
            >
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  );
}
