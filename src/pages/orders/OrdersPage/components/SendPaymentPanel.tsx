import type { ReactElement } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui';
import { ChargeBalanceSummary } from '@/components/orders';
import type { OrderView } from '../types';

interface SendPaymentPanelProps {
  view: OrderView;
  isPending: boolean;
  onSend: () => void;
}

function fmtSentAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SendPaymentPanel({ view, isPending, onSend }: SendPaymentPanelProps): ReactElement {
  const hasSent = !!view.paymentDetailsSentAt;

  return (
    <div className="border-b border-gray-100 p-5">
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
          <Send className="h-4 w-4 text-brand-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {hasSent ? 'Resend payment details' : 'Send payment details to customer'}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {hasSent
              ? 'Resend if the customer needs the details again.'
              : 'Sends the customer their amount due, bank account numbers, and payment reference via email, WhatsApp, and in-app notification.'}
          </p>
          {hasSent && view.paymentDetailsSentAt && (
            <p className="mt-1 text-xs text-gray-400">
              Last sent: {fmtSentAt(view.paymentDetailsSentAt)}
            </p>
          )}
          {view.finalChargeUsd !== null && (
            <ChargeBalanceSummary
              finalChargeUsd={view.finalChargeUsd}
              amountDue={view.amountDue}
              className="mt-2"
              valueClassName="text-brand-600"
            />
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant={hasSent ? 'secondary' : 'primary'}
          isLoading={isPending}
          leftIcon={!isPending ? <Send className="h-3.5 w-3.5" /> : undefined}
          onClick={onSend}
          className="shrink-0"
        >
          {hasSent ? 'Resend' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
