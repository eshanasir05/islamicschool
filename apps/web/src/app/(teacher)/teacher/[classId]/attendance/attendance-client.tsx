'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stepper } from '@skooly/ui';
import { type AttendanceInput, submitAttendance } from '@/app/(teacher)/actions';

type Student = { id: string; fullName: string };
type Status = 'present' | 'late' | 'absent';

const STEPS = [
  { label: 'Attendance' },
  { label: 'Hifz' },
  { label: 'Notes' },
  { label: 'Confirm' },
];

const STATUS_CYCLE: Status[] = ['present', 'late', 'absent'];

export default function AttendanceClient({ classId, students }: { classId: string; students: Student[] }) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(students.map(s => [s.id, 'present'])),
  );
  const [saving, setSaving] = useState(false);

  function toggle(studentId: string) {
    setStatuses(prev => {
      const current = prev[studentId] ?? 'present';
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]!;
      return { ...prev, [studentId]: next };
    });
  }

  function markAll(status: Status) {
    setStatuses(Object.fromEntries(students.map(s => [s.id, status])));
  }

  async function handleNext() {
    setSaving(true);
    const records: AttendanceInput[] = students.map(s => ({
      studentId: s.id,
      status: statuses[s.id] ?? 'present',
    }));
    await submitAttendance(classId, records);
    router.push(`/teacher/${classId}/hifz`);
  }

  return (
    <main className="app-main">
      <div style={{ marginTop: 24 }}>
        <Stepper steps={STEPS} current={0} />
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>
        Mark attendance
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
        Tap a student to cycle: Present → Late → Absent
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => markAll('present')}>All present</button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => markAll('absent')}>All absent</button>
      </div>

      <div className="attendance-grid">
        {students.map(s => {
          const status = statuses[s.id] ?? 'present';
          return (
            <button
              key={s.id}
              type="button"
              className={`attendance-student-card ${status}`}
              onClick={() => toggle(s.id)}
            >
              <span className="attendance-student-name">{s.fullName}</span>
              <span className={`badge badge-${status}`} style={{ textTransform: 'capitalize' }}>
                {status}
              </span>
            </button>
          );
        })}
      </div>

      <div className="wrap-actions">
        <button
          type="button"
          className="btn btn-accent"
          onClick={handleNext}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Next: Hifz →'}
        </button>
      </div>
    </main>
  );
}
