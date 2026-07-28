import type { ReactElement } from 'react';
import { Megaphone, X } from 'lucide-react';
import { useNotifications } from '@/hooks';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

/**
 * Superadmin "System Broadcast" (Settings → Support) currently only reaches
 * users via a WebSocket toast + the notification inbox — easy to miss if the
 * toast fires while the user isn't looking, or gone entirely on reload.
 * Surfaces the same unread broadcasts as persistent, dismissible banners on
 * the dashboard so affected users can't miss them. Dismissing marks the
 * underlying notification read, so it won't reappear on the next visit.
 */
export function BroadcastBanners(): ReactElement | null {
  const { notifications, markRead } = useNotifications();
  const broadcasts = notifications.filter((n) => n.isBroadcast && !n.isRead);

  if (broadcasts.length === 0) return null;

  return (
    <div className="space-y-3">
      {broadcasts.map((n) => (
        <div
          key={n.id}
          className="banner-enter rounded-xl border border-brand-200 bg-brand-50/60"
        >
          <div className="flex items-start gap-3 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <Megaphone className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                <span className="text-xs text-gray-400">· {relativeTime(n.createdAt)}</span>
              </div>
              <p className="mt-0.5 text-sm text-gray-700">{n.body?.trim() || n.message}</p>
            </div>
            <button
              type="button"
              onClick={() => markRead(n.id)}
              className="shrink-0 self-start rounded-lg p-1 text-gray-400 transition hover:bg-black/5 hover:text-gray-600"
              aria-label="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
