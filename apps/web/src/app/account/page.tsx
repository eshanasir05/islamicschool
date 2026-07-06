import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { env } from '@/env';
import Link from 'next/link';
import PasswordForm from './password-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { TaliblyLogo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { initialsOf } from '@/lib/initials';
import { AudioPermissionCard } from './audio-permission-card';
import {
  DEFAULT_CLASS_PREFS,
  DEFAULT_NOTIFICATION_PREFS,
  parseClassPrefs,
  parseNotificationPrefs,
  type ClassPrefs,
  type NotificationPrefs,
} from '@/lib/teacher-prefs';

function roleHome(role: string) {
  if (role === 'teacher') return '/teacher';
  if (role === 'parent') return '/parent';
  return '/admin';
}

type Props = { searchParams: Promise<{ updated?: string; photo?: string }> };
const NOTIFICATION_LABELS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: 'absenceResponses', label: 'Parent absence responses' },
  { key: 'trialAssigned', label: 'New trial assessment assigned' },
  { key: 'adminAnnouncement', label: 'Admin announcement' },
  { key: 'classReminder', label: 'Class reminder' },
  { key: 'homeworkDueSoon', label: 'Homework due soon' },
  { key: 'hifzReviewAlerts', label: 'Hifz review alerts' },
];

const labelStyle = { display: 'block' as const, fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' };
const selectStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 14,
  background: 'var(--surface)', color: 'var(--fg)',
  boxSizing: 'border-box' as const, maxWidth: 360,
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export default async function AccountPage({ searchParams }: Props) {
  const { updated: updatedParam, photo: photoParam } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [publicUser, membership] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, user.id) }),
    db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, user.id),
        eq(schema.memberships.organizationId, env.NEXT_PUBLIC_ORG_ID),
        eq(schema.memberships.status, 'active'),
      ),
    }),
  ]);

  const backHref = membership ? roleHome(membership.role) : '/';
  const isTeacher = membership?.role === 'teacher';
  const notificationPrefs = parseNotificationPrefs(publicUser?.notificationPrefs);
  const classPrefs = parseClassPrefs(publicUser?.classPrefs);

  async function updateNameAction(formData: FormData) {
    'use server';
    const fullName = (formData.get('fullName') as string | null)?.trim() ?? '';
    if (!fullName) return;
    const phone = (formData.get('phone') as string | null)?.trim() ?? '';
    const supabase2 = await createSupabaseServerClient();
    const { data: { user: caller } } = await supabase2.auth.getUser();
    if (!caller) redirect('/sign-in');
    await db
      .update(schema.users)
      .set({ fullName, phone: phone || null })
      .where(eq(schema.users.id, caller.id));
    redirect('/account?updated=1');
  }

  async function updateNotificationPrefsAction(formData: FormData) {
    'use server';
    const supabase2 = await createSupabaseServerClient();
    const { data: { user: caller } } = await supabase2.auth.getUser();
    if (!caller) redirect('/sign-in');
    const keys = Object.keys(DEFAULT_NOTIFICATION_PREFS) as (keyof NotificationPrefs)[];
    const prefs = Object.fromEntries(keys.map(k => [k, formData.get(k) === 'on'])) as NotificationPrefs;
    await db.update(schema.users).set({ notificationPrefs: prefs }).where(eq(schema.users.id, caller.id));
    redirect('/account?updated=notifications');
  }

  async function updateClassPrefsAction(formData: FormData) {
    'use server';
    const supabase2 = await createSupabaseServerClient();
    const { data: { user: caller } } = await supabase2.auth.getUser();
    if (!caller) redirect('/sign-in');
    const prefs: ClassPrefs = {
      defaultHifzStream: (formData.get('defaultHifzStream') as ClassPrefs['defaultHifzStream']) || DEFAULT_CLASS_PREFS.defaultHifzStream,
      defaultNoteType: (formData.get('defaultNoteType') as ClassPrefs['defaultNoteType']) || DEFAULT_CLASS_PREFS.defaultNoteType,
      showAyahRanges: formData.get('showAyahRanges') === 'on',
      showRetentionWarnings: formData.get('showRetentionWarnings') === 'on',
      sortStudents: (formData.get('sortStudents') as ClassPrefs['sortStudents']) || DEFAULT_CLASS_PREFS.sortStudents,
      reminderTime: (formData.get('reminderTime') as string) || DEFAULT_CLASS_PREFS.reminderTime,
    };
    await db.update(schema.users).set({ classPrefs: prefs }).where(eq(schema.users.id, caller.id));
    redirect('/account?updated=classprefs');
  }

  async function updateAvatarAction(formData: FormData) {
    'use server';
    const supabase2 = await createSupabaseServerClient();
    const { data: { user: caller } } = await supabase2.auth.getUser();
    if (!caller) redirect('/sign-in');

    const file = formData.get('avatar') as File | null;
    if (!file || file.size === 0) redirect('/account?photo=error_empty');
    if (file.size > MAX_AVATAR_BYTES) redirect('/account?photo=error_size');
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) redirect('/account?photo=error_type');

    const ext = file.type.split('/')[1] ?? 'jpg';
    const path = `${caller.id}/avatar-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const serviceClient = await createSupabaseServiceClient();
    const { error } = await serviceClient.storage
      .from('avatars')
      .upload(path, buffer, { contentType: file.type, upsert: true });
    if (error) redirect('/account?photo=error_upload');

    const { data } = serviceClient.storage.from('avatars').getPublicUrl(path);
    await db.update(schema.users).set({ avatarUrl: data.publicUrl }).where(eq(schema.users.id, caller.id));
    redirect('/account?photo=1');
  }

  async function removeAvatarAction() {
    'use server';
    const supabase2 = await createSupabaseServerClient();
    const { data: { user: caller } } = await supabase2.auth.getUser();
    if (!caller) redirect('/sign-in');
    await db.update(schema.users).set({ avatarUrl: null }).where(eq(schema.users.id, caller.id));
    redirect('/account?photo=removed');
  }

  const updatedMessages: Record<string, string> = {
    '1': 'Display name updated.',
    notifications: 'Notification preferences saved.',
    classprefs: 'Class preferences saved.',
  };
  const updatedMessage = updatedParam ? updatedMessages[updatedParam] : undefined;
  const photoNotices: Record<string, { type: 'success' | 'error'; message: string }> = {
    '1': { type: 'success', message: 'Profile picture updated.' },
    removed: { type: 'success', message: 'Profile picture removed.' },
    error_empty: { type: 'error', message: 'Please choose a photo to upload.' },
    error_size: { type: 'error', message: 'That photo is too large — please use one under 5 MB.' },
    error_type: { type: 'error', message: 'Please upload a PNG, JPEG, WEBP, or GIF image.' },
    error_upload: { type: 'error', message: 'Could not upload that photo. Please try again.' },
  };
  const photoNotice = photoParam ? photoNotices[photoParam] : undefined;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="app-header">
        <Link className="app-header-logo" href={backHref}>
          <TaliblyLogo iconSize={24} />
        </Link>
        <div className="app-header-right">
          <a className="app-logout" href="/auth/signout">Sign out</a>
        </div>
      </header>

      <main className="app-main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 20 }}>
          <Link href={backHref} style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
            ← Back
          </Link>
        </div>

        <h1 className="text-h1" style={{ marginBottom: 24 }}>Account</h1>

        {updatedMessage && (
          <div className="banner banner-success">{updatedMessage}</div>
        )}
        {photoNotice && (
          <div className={`banner banner-${photoNotice.type === 'error' ? 'error' : 'success'}`}>{photoNotice.message}</div>
        )}

        {/* Profile */}
        <div className="app-card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 16px' }}>Profile</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <span className="avatar" style={{ width: 64, height: 64, fontSize: 22, overflow: 'hidden' }}>
              {publicUser?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={publicUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initialsOf(publicUser?.fullName ?? user.email ?? '?')
              )}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <form action={updateAvatarAction} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="file"
                  name="avatar"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  required
                  style={{ fontSize: 13, maxWidth: 220 }}
                />
                <SubmitButton className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} pendingLabel="Uploading…">
                  Upload
                </SubmitButton>
              </form>
              {publicUser?.avatarUrl && (
                <form action={removeAvatarAction}>
                  <SubmitButton className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--muted)' }} pendingLabel="Removing…">
                    Remove photo
                  </SubmitButton>
                </form>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</div>
              <div style={{ fontSize: 14, color: 'var(--fg)' }}>{user.email}</div>
            </div>
            {membership && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</div>
                <div style={{ fontSize: 14, color: 'var(--fg)', textTransform: 'capitalize' }}>{membership.role}</div>
              </div>
            )}
          </div>

          <form action={updateNameAction} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label htmlFor="fullName" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Display name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                defaultValue={publicUser?.fullName ?? ''}
                required
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', fontSize: 14,
                  background: 'var(--surface)', color: 'var(--fg)',
                  boxSizing: 'border-box', maxWidth: 360,
                }}
              />
            </div>
            <div>
              <label htmlFor="phone" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Phone number <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={publicUser?.phone ?? ''}
                placeholder="(555) 555-5555"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', fontSize: 14,
                  background: 'var(--surface)', color: 'var(--fg)',
                  boxSizing: 'border-box', maxWidth: 360,
                }}
              />
            </div>
            <SubmitButton className="btn btn-accent" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '7px 14px' }} pendingLabel="Saving…">
              Save profile
            </SubmitButton>
          </form>
        </div>

        {/* Appearance */}
        <div className="app-card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 12px' }}>Appearance</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px' }}>
            Choose how Talibly looks on this device.
          </p>
          <ThemeToggle />
        </div>

        {/* Account security */}
        <div className="app-card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 16px' }}>Account security</h2>
          <PasswordForm />
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
              You can also sign in with a magic link sent to <strong style={{ color: 'var(--fg)' }}>{user.email}</strong> from
              the sign-in page — no password needed.
            </div>
            <a href="/auth/signout" className="btn btn-ghost" style={{ fontSize: 13, padding: '7px 14px', display: 'inline-block' }}>
              Sign out
            </a>
          </div>
        </div>

        {membership && !isTeacher && (
          <div className="app-card">
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 12px' }}>Role</h2>
            <div style={{ fontSize: 14, color: 'var(--fg)', textTransform: 'capitalize' }}>
              {membership.role}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Contact your administrator to change your role.
            </div>
          </div>
        )}

        {isTeacher && (
          <>
            {/* Notification preferences */}
            <div className="app-card" style={{ marginTop: 16, marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 4px' }}>Notification preferences</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
                Choose what you want to be notified about.
              </p>
              <form action={updateNotificationPrefsAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {NOTIFICATION_LABELS.map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--fg)', cursor: 'pointer' }}>
                    <input type="checkbox" name={key} defaultChecked={notificationPrefs[key]} style={{ width: 16, height: 16 }} />
                    {label}
                  </label>
                ))}
                <SubmitButton className="btn btn-accent" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '7px 14px', marginTop: 6 }} pendingLabel="Saving…">
                  Save notification preferences
                </SubmitButton>
              </form>
            </div>

            {/* Class preferences */}
            <div className="app-card" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 4px' }}>Class preferences</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
                Defaults used when you run a class session. You can always change these per-session.
              </p>
              <form action={updateClassPrefsAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label htmlFor="defaultHifzStream" style={labelStyle}>Default hifz mode</label>
                  <select id="defaultHifzStream" name="defaultHifzStream" defaultValue={classPrefs.defaultHifzStream} style={selectStyle}>
                    <option value="sabak">Sabak (new memorization)</option>
                    <option value="sabqi">Sabqi (recent review)</option>
                    <option value="manzil">Manzil (old review)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="defaultNoteType" style={labelStyle}>Default note type</label>
                  <select id="defaultNoteType" name="defaultNoteType" defaultValue={classPrefs.defaultNoteType} style={selectStyle}>
                    <option value="praise">Praise</option>
                    <option value="homework">Homework</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sortStudents" style={labelStyle}>Sort students by</label>
                  <select id="sortStudents" name="sortStudents" defaultValue={classPrefs.sortStudents} style={selectStyle}>
                    <option value="alphabetical">Alphabetical</option>
                    <option value="attention">Attention needed</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="reminderTime" style={labelStyle}>Default class session reminder time</label>
                  <input id="reminderTime" name="reminderTime" type="time" defaultValue={classPrefs.reminderTime} style={selectStyle} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--fg)', cursor: 'pointer' }}>
                  <input type="checkbox" name="showAyahRanges" defaultChecked={classPrefs.showAyahRanges} style={{ width: 16, height: 16 }} />
                  Show ayah ranges
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--fg)', cursor: 'pointer' }}>
                  <input type="checkbox" name="showRetentionWarnings" defaultChecked={classPrefs.showRetentionWarnings} style={{ width: 16, height: 16 }} />
                  Show retention warnings
                </label>
                <SubmitButton className="btn btn-accent" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '7px 14px' }} pendingLabel="Saving…">
                  Save class preferences
                </SubmitButton>
              </form>
            </div>

            <AudioPermissionCard />

            {/* Support */}
            <div className="app-card">
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', margin: '0 0 12px' }}>Support</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link href="/quick-start" style={{ fontSize: 14, color: 'var(--accent)' }}>Quick Start guide</Link>
                <a href="mailto:info@talibly.com" style={{ fontSize: 14, color: 'var(--accent)' }}>Contact support: info@talibly.com</a>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
