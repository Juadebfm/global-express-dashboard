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
  /**
   * Optional retry callback. When set, the toast renders a "Retry" button
   * that fires this callback. Used for transient errors (HTTP 500/503)
   * where the user's intent is unchanged and re-firing the mutation is
   * the right next step. Wire via `buildErrorFeedback` so the gate (only
   * 5xx errors get a Retry button) is centralised.
   */
  retry?: () => void;
}

export interface PushFeedbackInput {
  tone: FeedbackTone;
  message: string;
  title?: string;
  referenceId?: string;
  retry?: () => void;
  durationMs?: number;
}

export interface FeedbackStore {
  messages: FeedbackMessage[];
  pushMessage: (input: PushFeedbackInput) => string;
  dismissMessage: (id: string) => void;
  clearMessages: () => void;
}
