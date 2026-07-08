'use client';

import { useRouter } from 'next/navigation';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All milestones' },
  { value: 'surah_completed', label: 'Surah completed' },
  { value: 'juz_completed', label: 'Juz completed' },
  { value: 'revision_completed', label: 'Revision completed' },
];

const DATE_OPTIONS = [
  { value: 'all', label: 'Any date' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'last_90', label: 'Last 90 days' },
  { value: 'this_year', label: 'This year' },
];

export function QuranFilters({
  pathname,
  type,
  date,
}: { pathname: string; type: string; date: string }) {
  const router = useRouter();

  function update(next: { type: string; date: string }) {
    const params = new URLSearchParams();
    if (next.type !== 'all') params.set('type', next.type);
    if (next.date !== 'all') params.set('date', next.date);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
      <select
        className="form-select"
        value={type}
        onChange={(e) => update({ type: e.target.value, date })}
        style={{ maxWidth: 190 }}
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        className="form-select"
        value={date}
        onChange={(e) => update({ type, date: e.target.value })}
        style={{ maxWidth: 180 }}
      >
        {DATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
