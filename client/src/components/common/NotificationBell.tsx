import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationFeed, NotificationRecord } from '@shared/types';
import { fetchNotifications, markNotificationsRead } from '../../api/auth';
import { useLiveRefresh, throttledWhenLive } from '../../lib/live';
import { BellIcon } from './icons';

const POLL_MS = 30_000;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

/** Bell with an unread count and a list of recent notifications. Refreshes while the tab is visible. */
export function NotificationBell() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<NotificationFeed>({ items: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    fetchNotifications()
      .then(setFeed)
      .catch(() => undefined); // A failed refresh keeps the last list; the bell is never worth an error screen.
  }, []);

  useEffect(() => {
    refresh();
    const tick = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const interval = window.setInterval(throttledWhenLive(tick, 4), POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refresh]);

  useLiveRefresh(refresh);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = (item: NotificationRecord) => {
    setOpen(false);
    if (!item.read) {
      setFeed((current) => ({
        unreadCount: Math.max(0, current.unreadCount - 1),
        items: current.items.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
      }));
      void markNotificationsRead({ ids: [item.id] }).catch(() => undefined);
    }
    if (item.link) {
      if (item.link.includes('#')) {
        const [path, hash] = item.link.split('#');
        navigate({ pathname: path, hash: `#${hash}` });
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        navigate(item.link);
      }
    }
  };

  const markAll = () => {
    setFeed((current) => ({ unreadCount: 0, items: current.items.map((entry) => ({ ...entry, read: true })) }));
    void markNotificationsRead({ all: true }).catch(() => undefined);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn-ghost btn-sm relative"
        aria-label={feed.unreadCount > 0 ? `Notifications, ${feed.unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <BellIcon className="h-4 w-4" />
        {feed.unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-none text-night">
            {feed.unreadCount > 9 ? '9+' : feed.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="surface absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-scale-in overflow-hidden p-0 shadow-xl">
          <div className="flex items-center justify-between border-b border-night-border px-4 py-3">
            <p className="text-sm font-semibold text-parchment">Notifications</p>
            {feed.unreadCount > 0 && (
              <button type="button" onClick={markAll} className="text-xs text-gold-soft hover:underline">Mark all read</button>
            )}
          </div>
          {feed.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Nothing new yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {feed.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className="flex w-full items-start gap-3 border-b border-night-border/60 px-4 py-3 text-left transition hover:bg-night-raised"
                  >
                    <span aria-hidden="true" className={`mt-1.5 h-2 w-2 flex-none rounded-full ${item.read ? 'bg-transparent' : 'bg-gold'}`} />
                    <span className="min-w-0">
                      <span className={`block text-sm ${item.read ? 'text-muted' : 'font-medium text-parchment'}`}>{item.title}</span>
                      <span className="block truncate text-xs text-muted">{item.body}</span>
                      <span className="mt-0.5 block text-[11px] text-muted/80">{timeAgo(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
