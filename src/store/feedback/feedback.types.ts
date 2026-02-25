export type FeedbackTone = 'success' | 'error' | 'info' | 'warning';

export interface FeedbackMessage {
  id: string;
  tone: FeedbackTone;
  message: string;
  title?: string;
}

export interface PushFeedbackInput {
  tone: FeedbackTone;
  message: string;
  title?: string;
  durationMs?: number;
}

export interface FeedbackStore {
  messages: FeedbackMessage[];
  pushMessage: (input: PushFeedbackInput) => string;
  dismissMessage: (id: string) => void;
  clearMessages: () => void;
}
