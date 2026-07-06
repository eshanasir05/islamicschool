'use client';

import { useEffect, useRef, useState } from 'react';

type MicStatus = 'unknown' | 'granted' | 'denied' | 'prompt' | 'unsupported';

const labelStyle = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' };

export function AudioPermissionCard() {
  const [status, setStatus] = useState<MicStatus>('unknown');
  const [testState, setTestState] = useState<'idle' | 'recording' | 'played' | 'error'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.permissions?.query) {
      setStatus('unsupported');
      return;
    }
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then(result => {
        setStatus(result.state as MicStatus);
        result.onchange = () => setStatus(result.state as MicStatus);
      })
      .catch(() => setStatus('unsupported'));
  }, []);

  async function toggleTestRecording() {
    if (testState === 'recording') {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        setTestState('played');
        setStatus('granted');
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setTestState('recording');
    } catch {
      setTestState('error');
      setStatus('denied');
    }
  }

  const statusLabel: Record<MicStatus, string> = {
    unknown: 'Checking…',
    granted: 'Allowed',
    denied: 'Blocked',
    prompt: 'Not yet asked',
    unsupported: "Can't detect (try recording below)",
  };
  const statusColor: Record<MicStatus, string> = {
    unknown: 'var(--muted)',
    granted: 'var(--success, #16a34a)',
    denied: 'var(--danger, #dc2626)',
    prompt: 'var(--muted)',
    unsupported: 'var(--muted)',
  };

  return (
    <div className="app-card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 12px' }}>Audio permissions</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
        Hifz recordings need microphone access. Check your status here before class.
      </p>

      <div style={{ marginBottom: 14 }}>
        <div style={labelStyle}>Microphone status</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: statusColor[status] }}>{statusLabel[status]}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: 13, padding: '7px 14px' }}
          onClick={toggleTestRecording}
        >
          {testState === 'recording' ? 'Stop test recording' : 'Test recording'}
        </button>
        {testState === 'recording' && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Recording… speak, then stop.</span>}
        {testState === 'error' && <span style={{ fontSize: 12, color: 'var(--danger, #dc2626)' }}>Microphone access was blocked.</span>}
      </div>

      {audioUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={audioRef} src={audioUrl} controls style={{ width: '100%', marginBottom: 12 }} />
      )}

      <details style={{ fontSize: 13, color: 'var(--muted)' }}>
        <summary style={{ cursor: 'pointer', color: 'var(--fg)', fontWeight: 500 }}>My browser blocked the microphone — what do I do?</summary>
        <div style={{ marginTop: 8, lineHeight: 1.6 }}>
          Look for a camera/microphone icon in your browser&apos;s address bar and click &quot;Allow&quot;. If you don&apos;t see one,
          open your browser&apos;s site settings for this page and set Microphone to &quot;Allow&quot;, then reload the page.
          You can still submit hifz entries without audio if needed.
        </div>
      </details>
    </div>
  );
}
