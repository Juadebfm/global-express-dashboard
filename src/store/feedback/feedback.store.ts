import { create } from 'zustand';
import type { FeedbackStore } from './feedback.types';

const DEFAULT_DURATION_MS = 5000;

function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  messages: [],
  pushMessage: ({ tone, message, title, referenceId, retry, durationMs }) => {
    const id = createMessageId();
    // Retry-bearing toasts stay until the user dismisses or clicks Retry —
    // auto-dismiss would yank the recovery affordance out from under them.
    // Callers can still force a finite duration by passing durationMs.
    const nextDuration =
      durationMs ?? (retry ? 0 : DEFAULT_DURATION_MS);
    set((state) => ({
      messages: [...state.messages, { id, tone, message, title, referenceId, retry }],
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
