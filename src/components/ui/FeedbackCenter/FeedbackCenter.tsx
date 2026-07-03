import type { ReactElement } from 'react';
import { AlertCircle, CheckCircle2, Info, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils';
import { useFeedbackStore } from '@/store';
import type { FeedbackTone } from '@/store/feedback/feedback.types';

const TONE_ICON: Record<FeedbackTone, ReactElement> = {
  success: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  error: <AlertCircle className="h-4 w-4 text-red-400" />,
  info: <Info className="h-4 w-4 text-sky-400" />,
  warning: <TriangleAlert className="h-4 w-4 text-amber-400" />,
};

const TONE_PROGRESS: Record<FeedbackTone, string> = {
  success: 'bg-green-400',
  error: 'bg-red-400',
  info: 'bg-sky-400',
  warning: 'bg-amber-400',
};

export function FeedbackCenter(): ReactElement | null {
  const { t } = useTranslation('common');
  const messages = useFeedbackStore((state) => state.messages);
  const dismissMessage = useFeedbackStore((state) => state.dismissMessage);

  if (messages.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-[360px] flex-col gap-2">
      {messages.map((item) => (
        <div
          key={item.id}
          role={item.tone === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-gray-900 px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.3),0_2px_6px_rgba(0,0,0,0.15)]"
        >
          <span className="mt-0.5 shrink-0">{TONE_ICON[item.tone]}</span>

          <div className="min-w-0 flex-1">
            {item.title && (
              <p className="text-[13px] font-medium leading-snug text-gray-100">{item.title}</p>
            )}
            <p className={cn('text-[12px] leading-snug text-zinc-400', item.title && 'mt-0.5')}>
              {item.message}
            </p>
            {item.referenceId && (
              <p className="mt-1 font-mono text-[11px] text-zinc-600">Ref: {item.referenceId}</p>
            )}
            {item.retry && (
              <button
                type="button"
                onClick={() => {
                  dismissMessage(item.id);
                  item.retry?.();
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-gray-300 transition hover:bg-white/10"
              >
                <RefreshCw className="h-3 w-3" />
                {t('feedback.retry')}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => dismissMessage(item.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded p-0.5 text-zinc-600 transition hover:text-gray-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div
            className={cn('absolute bottom-0 left-0 h-[2px] w-1/2 opacity-40', TONE_PROGRESS[item.tone])}
          />
        </div>
      ))}
    </div>
  );
}
