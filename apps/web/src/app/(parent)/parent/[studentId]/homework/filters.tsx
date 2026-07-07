'use client';

import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All homework' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'done', label: 'Completed' },
];
const DUE_OPTIONS = [
  { value: 'all', label: 'Any due date' },
  { value: 'due_soon', label: 'Due soon' },
  { value: 'past_due', label: 'Past due' },
];

export function HomeworkFilters({ pathname, status, due }: { pathname: string; status: string; due: string }) {
  const router = useRouter();

  function update(next: { status: string; due: string }) {
    const params = new URLSearchParams();
    if (next.status !== 'all') params.set('status', next.status);
    if (next.due !== 'all') params.set('due', next.due);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
      <select
        className="form-select"
        value={status}
        onChange={e => update({ status: e.target.value, due })}
        style={{ maxWidth: 180 }}
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        className="form-select"
        value={due}
        onChange={e => update({ status, due: e.target.value })}
        style={{ maxWidth: 180 }}
      >
        {DUE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
