import { create } from 'zustand';
import type { FeedbackStore } from './feedback.types';

const DEFAULT_DURATION_MS = 5000;

function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  messages: [],
  pushMessage: ({ tone, message, title, durationMs }) => {
    const id = createMessageId();
    const nextDuration = durationMs ?? DEFAULT_DURATION_MS;
    set((state) => ({
      messages: [...state.messages, { id, tone, message, title }],
    }));

    if (nextDuration > 0) {
      globalThis.setTimeout(() => {
        get().dismissMessage(id);
      }, nextDuration);
    }

    return id;
  },
  dismissMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== id),
    })),
  clearMessages: () => set({ messages: [] }),
}));
