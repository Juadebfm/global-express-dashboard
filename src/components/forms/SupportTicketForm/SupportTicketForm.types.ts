import type { CreateSupportTicketPayload } from '@/types';

export interface SupportTicketFormProps {
  onSubmit: (payload: CreateSupportTicketPayload) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  successMessage?: string | null;
}
