'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/marketing/icon';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const POLL_MS = 45_000;

function relativeTime(iso: string) {
  const at = new Date(iso);
  const mins = Math.round((Date.now() - at.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setLoaded(true);
    } catch {
      // Silently ignore — the bell just won't update this cycle.
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    timer.current = setInterval(fetchNotifications, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [fetchNotifications]);

  async function markRead(id: string) {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount(c => Math.max(0, c - 1));
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markRead', id }),
    }).catch(() => null);
  }

  async function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markAllRead' }),
    }).catch(() => null);
  }

  async function handleClick(n: NotificationItem) {
    if (!n.readAt) await markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="notif-bell-wrap">
      <button
        type="button"
        className="notif-bell-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Notifications"
      >
        <Icon name="bell" size={19} />
        {loaded && unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <button type="button" className="notif-backdrop" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="notif-panel" role="menu">
            <div className="notif-panel-head">
              <span className="notif-panel-title">Notifications</span>
              {unreadCount > 0 && (
                <button type="button" className="notif-mark-all" onClick={markAllRead}>
                  Mark all as read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <div className="notif-empty">You&apos;re all caught up.</div>
            ) : (
              items.map(n => (
                <button
                  key={n.id}
                  type="button"
                  className={`notif-item${!n.readAt ? ' is-unread' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="notif-item-title">{n.title}</div>
                  {n.body && <div className="notif-item-body">{n.body}</div>}
                  <div className="notif-item-time">{relativeTime(n.createdAt)}</div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
