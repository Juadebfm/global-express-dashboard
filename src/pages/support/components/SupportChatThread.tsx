import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import type { SupportMessage } from '@/types';
import { SupportChatBubble } from './SupportChatBubble';

interface SupportChatThreadProps {
  messages: SupportMessage[];
  currentUserId: string;
  isStaff: boolean;
}

export function SupportChatThread({ messages, currentUserId, isStaff }: SupportChatThreadProps): ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Filter out internal notes for non-staff
  const visibleMessages = isStaff ? messages : messages.filter((m) => !m.isInternal);

  if (visibleMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12 text-sm text-gray-400">
        No messages yet. Start the conversation below.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {visibleMessages.map((msg) => (
        <SupportChatBubble
          key={msg.id}
          message={msg}
          isCurrentUser={msg.senderId === currentUserId}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
