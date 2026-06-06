'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Stepper } from '@skooly/ui';
import { type HifzInput, submitHifz } from '@/app/(teacher)/actions';

type Student = { id: string; fullName: string };

type HifzEntry = {
  stream: 'sabak' | 'sabqi' | 'manzil';
  surahNumber: number;
  ayahStart: number;
  ayahEnd: number;
  audioDataUrl: string | null;
};

const STEPS = [{ label: 'Attendance' }, { label: 'Hifz' }, { label: 'Notes' }, { label: 'Confirm' }];

const DEFAULT_ENTRY: HifzEntry = { stream: 'sabak', surahNumber: 2, ayahStart: 1, ayahEnd: 5, audioDataUrl: null };

export default function HifzClient({ classId, students }: { classId: string; students: Student[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState<Record<string, HifzEntry>>(
    Object.fromEntries(students.map(s => [s.id, { ...DEFAULT_ENTRY }])),
  );
  const [recording, setRecording] = useState<Record<string, boolean>>({});
  const mediaRecorderRef = useRef<Record<string, MediaRecorder>>({});
  const chunksRef = useRef<Record<string, Blob[]>>({});
  const [saving, setSaving] = useState(false);

  function updateEntry(studentId: string, patch: Partial<HifzEntry>) {
    setEntries(prev => ({ ...prev, [studentId]: { ...(prev[studentId] ?? DEFAULT_ENTRY), ...patch } as HifzEntry }));
  }

  async function toggleRecording(studentId: string) {
    if (recording[studentId]) {
      mediaRecorderRef.current[studentId]?.stop();
      setRecording(prev => ({ ...prev, [studentId]: false }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current[studentId] = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current[studentId]?.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current[studentId], { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => updateEntry(studentId, { audioDataUrl: reader.result as string });
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current[studentId] = mr;
      mr.start();
      setRecording(prev => ({ ...prev, [studentId]: true }));
    } catch {
      alert('Microphone access denied. You can still submit without audio.');
    }
  }

  async function handleNext() {
    setSaving(true);
    const inputs: HifzInput[] = students.map(s => ({
      studentId: s.id,
      ...(entries[s.id] ?? DEFAULT_ENTRY),
    }));
    await submitHifz(classId, inputs);
    router.push(`/teacher/${classId}/notes`);
  }

  return (
    <main className="app-main">
      <div style={{ marginTop: 24 }}>
        <Stepper steps={STEPS} current={1} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 6px', color: 'var(--fg)' }}>Hifz entries</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>Record each student's recitation for today.</p>

      {students.map(s => {
        const entry = entries[s.id] ?? DEFAULT_ENTRY;
        const isRecording = recording[s.id];
        return (
          <div key={s.id} className="hifz-student-block">
            <div className="hifz-student-name">{s.fullName}</div>
            <div className="hifz-fields">
              <div className="hifz-field">
                <label>Stream</label>
                <select value={entry.stream} onChange={e => updateEntry(s.id, { stream: e.target.value as HifzEntry['stream'] })}>
                  <option value="sabak">Sabak</option>
                  <option value="sabqi">Sabqi</option>
                  <option value="manzil">Manzil</option>
                </select>
              </div>
              <div className="hifz-field">
                <label>Surah</label>
                <input type="number" min={1} max={114} value={entry.surahNumber}
                  onChange={e => updateEntry(s.id, { surahNumber: Number(e.target.value) })} />
              </div>
              <div className="hifz-field">
                <label>Ayah start</label>
                <input type="number" min={1} value={entry.ayahStart}
                  onChange={e => updateEntry(s.id, { ayahStart: Number(e.target.value) })} />
              </div>
              <div className="hifz-field">
                <label>Ayah end</label>
                <input type="number" min={1} value={entry.ayahEnd}
                  onChange={e => updateEntry(s.id, { ayahEnd: Number(e.target.value) })} />
              </div>
              <div className="hifz-field">
                <label>Recording</label>
                <button
                  type="button"
                  className={`btn ${isRecording ? 'btn-ghost' : 'btn-secondary'}`}
                  style={{ height: 38, fontSize: 13, width: '100%' }}
                  onClick={() => toggleRecording(s.id)}
                >
                  {isRecording ? '⏹ Stop' : entry.audioDataUrl ? '✓ Re-record' : '🎙 Record'}
                </button>
              </div>
              {entry.audioDataUrl && (
                <div className="hifz-field hifz-field-wide">
                  <label>Preview</label>
                  {/* biome-ignore lint/a11y/useMediaCaption: demo audio */}
                  <audio src={entry.audioDataUrl} controls style={{ width: '100%', height: 36 }} />
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="wrap-actions">
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>← Back</button>
        <button type="button" className="btn btn-accent" onClick={handleNext} disabled={saving}>
          {saving ? 'Saving…' : 'Next: Notes →'}
        </button>
      </div>
    </main>
  );
}
