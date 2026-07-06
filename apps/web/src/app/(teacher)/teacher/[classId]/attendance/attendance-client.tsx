'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stepper } from '@skooly/ui';
import { type AttendanceInput, submitAttendance } from '@/app/(teacher)/actions';

type Student = { id: string; fullName: string };
type Status = 'present' | 'late' | 'absent' | 'excused';

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excused' },
];

export default function AttendanceClient({ classId, students }: { classId: string; students: Student[] }) {
  const router = useRouter();
  const STEPS = [
    { label: 'Attendance', href: `/teacher/${classId}/attendance` },
    { label: 'Hifz', href: `/teacher/${classId}/hifz` },
    { label: 'Notes', href: `/teacher/${classId}/notes` },
    { label: 'Confirm', href: `/teacher/${classId}/confirm` },
  ];
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(students.map(s => [s.id, 'present'])),
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function setStatus(studentId: string, status: Status) {
    setStatuses(prev => ({ ...prev, [studentId]: status }));
  }

  function setNote(studentId: string, note: string) {
    setNotes(prev => ({ ...prev, [studentId]: note }));
  }

  function markAll(status: Status) {
    setStatuses(Object.fromEntries(students.map(s => [s.id, status])));
  }

  async function handleNext() {
    setSaving(true);
    const records: AttendanceInput[] = students.map(s => ({
      studentId: s.id,
      status: statuses[s.id] ?? 'present',
      notes: statuses[s.id] === 'excused' ? notes[s.id] : undefined,
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
        Tap Present, Late, Absent, or Excused for each student. Excused is for absences the
        family already told you about — it won&apos;t prompt them for a reason.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => markAll('present')}>All present</button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => markAll('absent')}>All absent</button>
      </div>

      <div className="attendance-grid">
        {students.map(s => {
          const status = statuses[s.id] ?? 'present';
          return (
            <div key={s.id} className="attendance-row-wrap">
              <div className="attendance-row">
                <span className="attendance-student-name">{s.fullName}</span>
                <div className="attendance-status-buttons" role="group" aria-label={`${s.fullName}'s attendance status`}>
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`attendance-status-btn ${opt.value}${status === opt.value ? ' is-selected' : ''}`}
                      onClick={() => setStatus(s.id, opt.value)}
                      aria-pressed={status === opt.value}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {status === 'excused' && (
                <input
                  type="text"
                  className="form-input attendance-note-input"
                  placeholder="Reason (optional) — e.g. sick, told you in advance"
                  value={notes[s.id] ?? ''}
                  onChange={e => setNote(s.id, e.target.value)}
                  aria-label={`Reason ${s.fullName} is excused`}
                />
              )}
            </div>
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
