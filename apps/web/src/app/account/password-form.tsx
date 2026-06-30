'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function PasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess(true);
    setNewPassword('');
    setConfirm('');
    setLoading(false);
  }

  if (success) {
    return (
      <div className="banner banner-success" style={{ marginBottom: 0 }}>
        Password updated successfully.{' '}
        <button type="button" onClick={() => setSuccess(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, padding: 0 }}>
          Change again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="password"
        placeholder="New password"
        value={newPassword}
        onChange={e => setNewPassword(e.target.value)}
        required
        autoComplete="new-password"
        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--surface)', color: 'var(--fg)' }}
      />
      <input
        type="password"
        placeholder="Confirm new password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        required
        autoComplete="new-password"
        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--surface)', color: 'var(--fg)' }}
      />
      {error && <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-accent" style={{ alignSelf: 'flex-start' }}>
        {loading ? 'Saving…' : 'Update password'}
      </button>
    </form>
  );
}
