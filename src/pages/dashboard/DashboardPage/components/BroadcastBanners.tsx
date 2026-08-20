import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useNotifications } from '@/hooks';

function readMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isSafeInternalPath(value: string | null): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}

/**
 * Surfaces unread system broadcasts as persistent, dismissible dashboard
 * banners. Dismissing deletes only the signed-in user's copy, so it will not
 * reappear for them while remaining visible for other eligible recipients.
 */
export function BroadcastBanners(): ReactElement | null {
  const { notifications, deleteOne } = useNotifications();
  const broadcasts = notifications.filter((n) => n.isBroadcast && !n.isRead);

  if (broadcasts.length === 0) return null;

  return (
    <div className="space-y-3">
      {broadcasts.map((n) => (
        (() => {
          const metadata = n.metadata ?? {};
          const imageUrl = readMetadataString(metadata, 'imageUrl');
          const actionLabel = readMetadataString(metadata, 'actionLabel');
          const actionUrl = readMetadataString(metadata, 'actionUrl');
          const hasAction = !!actionLabel && isSafeInternalPath(actionUrl);

          return (
            <div
              key={n.id}
              className="banner-enter overflow-hidden rounded-[2rem] bg-black text-white shadow-[0_16px_36px_rgba(0,0,0,0.16)]"
            >
              <div className="flex items-start gap-5 px-6 py-6 sm:px-8 sm:py-7">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
                  />
                )}
                <div className="min-w-0 flex-1 pr-1">
                  <p className="text-xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                    {n.title}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-gray-200 sm:text-xl">
                    {n.body?.trim() || n.message}
                  </p>
                  {hasAction && (
                    <Link
                      to={actionUrl}
                      className="mt-5 inline-block text-lg font-medium text-white underline underline-offset-4 transition hover:text-gray-300 sm:text-2xl"
                    >
                      {actionLabel}
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => deleteOne(n.id)}
                  className="-mr-2 -mt-2 shrink-0 rounded-xl p-2 text-white transition hover:bg-white/10"
                  aria-label="Dismiss announcement"
                >
                  <X className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          );
        })()
      ))}
    </div>
  );
}
