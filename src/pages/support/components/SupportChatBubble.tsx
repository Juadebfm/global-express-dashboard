import type { ReactElement } from 'react';
import type { SupportMessage } from '@/types';

interface SupportChatBubbleProps {
  message: SupportMessage;
  isCurrentUser: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function SupportChatBubble({ message, isCurrentUser }: SupportChatBubbleProps): ReactElement {
  if (message.isInternal) {
    return (
      <div className="mx-auto my-2 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-amber-600">
          <span>Internal Note</span>
          <span className="font-normal text-amber-500">{message.senderName}</span>
        </div>
        <p className="text-sm text-amber-800 whitespace-pre-wrap">{message.body}</p>
        <span className="mt-1 block text-[10px] text-amber-500">{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} my-1.5`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isCurrentUser
            ? 'rounded-br-md bg-brand-600 text-white'
            : 'rounded-bl-md bg-gray-100 text-gray-900'
        }`}
      >
        {!isCurrentUser && (
          <span className={`mb-0.5 block text-[11px] font-semibold ${isCurrentUser ? 'text-brand-200' : 'text-gray-500'}`}>
            {message.senderName}
          </span>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        <span
          className={`mt-1 block text-[10px] ${
            isCurrentUser ? 'text-brand-200' : 'text-gray-400'
          }`}
        >
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
