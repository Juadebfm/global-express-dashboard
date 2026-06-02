export type FeedbackTone = 'success' | 'error' | 'info' | 'warning';

export interface FeedbackMessage {
  id: string;
  tone: FeedbackTone;
  message: string;
  title?: string;
  /**
   * Backend request correlation ID (RFC 7807 `requestId` / `X-Request-ID`).
   * When present, the toast renders "Ref: <id>" so users can quote it in
   * support tickets. (Not named `ref` to avoid React's reserved prop.)
   */
  referenceId?: string;
}

export interface PushFeedbackInput {
  tone: FeedbackTone;
  message: string;
  title?: string;
  referenceId?: string;
  durationMs?: number;
}

export interface FeedbackStore {
  messages: FeedbackMessage[];
  pushMessage: (input: PushFeedbackInput) => string;
  dismissMessage: (id: string) => void;
  clearMessages: () => void;
}
