'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stepper } from '@skooly/ui';
import { type NoteInput, submitNotes } from '@/app/(teacher)/actions';

type Student = { id: string; fullName: string };
type NoteType = 'praise' | 'homework';

type NoteState = { type: NoteType; category: string; content: string };

const PRAISE_CATEGORIES = ['Adab', 'Effort', 'Improvement', 'Helpfulness'];
const STEPS = [{ label: 'Attendance' }, { label: 'Hifz' }, { label: 'Notes' }, { label: 'Confirm' }];

export default function NotesClient({ classId, students }: { classId: string; students: Student[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, NoteState>>(
    Object.fromEntries(students.map(s => [s.id, { type: 'praise', category: 'Effort', content: '' }])),
  );
  const [saving, setSaving] = useState(false);

  function update(studentId: string, patch: Partial<NoteState>) {
    setNotes(prev => ({ ...prev, [studentId]: { ...(prev[studentId] ?? { type: 'praise' as NoteType, category: 'Effort', content: '' }), ...patch } as NoteState }));
  }

  async function handleNext() {
    setSaving(true);
    const inputs: NoteInput[] = students
      .filter(s => notes[s.id]?.content.trim())
      .map(s => {
        const note = notes[s.id]!;
        return {
          studentId: s.id,
          noteType: note.type,
          category: note.type === 'praise' ? note.category : undefined,
          content: note.content.trim(),
        };
      });
    await submitNotes(classId, inputs);
    router.push(`/teacher/${classId}/confirm`);
  }

  return (
    <main className="app-main">
      <div style={{ marginTop: 24 }}>
        <Stepper steps={STEPS} current={2} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>Praise & homework</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>Optional. Leave blank to skip a student.</p>

      {students.map(s => {
        const note = notes[s.id]!;
        return (
          <div key={s.id} className="notes-student-block">
            <div className="notes-student-name">{s.fullName}</div>
            <div className="note-type-tabs">
              {(['praise', 'homework'] as NoteType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`note-type-tab ${note.type === t ? 'active' : ''}`}
                  onClick={() => update(s.id, { type: t })}
                  style={{ textTransform: 'capitalize' }}
                >
                  {t}
                </button>
              ))}
            </div>

            {note.type === 'praise' && (
              <div className="category-chips" style={{ marginBottom: 10 }}>
                {PRAISE_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-chip ${note.category === cat ? 'active' : ''}`}
                    onClick={() => update(s.id, { category: cat })}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <textarea
              className="note-textarea"
              placeholder={note.type === 'praise' ? 'What did they do well today?' : 'What should they practice before next class?'}
              value={note.content}
              onChange={e => update(s.id, { content: e.target.value })}
              rows={3}
            />
          </div>
        );
      })}

      <div className="wrap-actions">
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>← Back</button>
        <button type="button" className="btn btn-accent" onClick={handleNext} disabled={saving}>
          {saving ? 'Saving…' : 'Next: Review →'}
        </button>
      </div>
    </main>
  );
}
