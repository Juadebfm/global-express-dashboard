import type { ReactElement } from 'react';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { useFeedbackStore } from '@/store';

export function FeedbackCenter(): ReactElement | null {
  const messages = useFeedbackStore((state) => state.messages);
  const dismissMessage = useFeedbackStore((state) => state.dismissMessage);

  if (messages.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] w-full max-w-sm space-y-2">
      {messages.map((item) => (
        <AlertBanner
          key={item.id}
          tone={item.tone}
          title={item.title}
          message={item.message}
          onClose={() => dismissMessage(item.id)}
          className="pointer-events-auto"
        />
      ))}
    </div>
  );
}
