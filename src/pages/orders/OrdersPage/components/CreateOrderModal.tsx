import type { FormEvent, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, Send, Ship, User } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/utils';
import type { OrderView } from '../types';

interface CreateOrderModalProps {
  view: OrderView;
  isPending: boolean;
  onSubmit: (payload: {
    senderId: string;
    recipientName: string;
    recipientPhone: string;
    recipientEmail: string;
    shipmentType: 'air' | 'sea';
    weight: string;
    declaredValue: string;
    description: string;
    orderDirection: 'outbound';
    idempotencyKey: string;
  }) => Promise<{ trackingNumber: string }>;
  onClose: () => void;
}

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 transition placeholder:text-gray-400';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }): ReactElement {
  return (
    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
      {children}{required && <span className="ml-0.5 text-red-400">*</span>}
    </p>
  );
}

export function CreateOrderModal({
  view,
  isPending,
  onSubmit,
  onClose,
}: CreateOrderModalProps): ReactElement {
  const [shipmentType, setShipmentType] = useState<'air' | 'sea'>('air');
  const [recipientName] = useState(view.recipientName ?? '');
  const [recipientPhone] = useState(view.recipientPhone ?? '');
  const [recipientEmail] = useState('');
  const [weight, setWeight] = useState('');
  const [declaredValue, setDeclaredValue] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createdTracking, setCreatedTracking] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!weight.trim() || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) {
      setError('Enter a valid weight / CBM.'); return;
    }
    if (!description.trim()) { setError('Describe the contents.'); return; }

    const idempotencyKey = `staff-order-${view.senderId}-${Date.now()}`;
    const weightFormatted = shipmentType === 'air' ? `${weight}kg` : `${weight}cbm`;

    try {
      const result = await onSubmit({
        senderId: view.senderId,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        recipientEmail: recipientEmail.trim(),
        shipmentType,
        weight: weightFormatted,
        declaredValue: declaredValue.trim() || '0',
        description: description.trim(),
        orderDirection: 'outbound',
        idempotencyKey,
      });
      setCreatedTracking(result.trackingNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order. Please try again.');
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Create new order</h2>
            <p className="mt-0.5 text-sm text-gray-500">New shipment for this customer — separate tracking number.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {createdTracking ? (
          /* ── Success state ── */
          <div className="space-y-4 px-6 py-6">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Order created</p>
                <p className="mt-0.5 text-sm text-emerald-700">
                  Tracking number:{' '}
                  <span className="font-mono font-semibold">{createdTracking}</span>
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  The order is in the queue — warehouse staff can verify it when the goods arrive.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-4 px-6 py-5">

              {/* Customer + recipient — locked */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Customer</p>
                    <p className="text-sm font-semibold text-gray-800">{view.senderName || '—'}</p>
                  </div>
                </div>
                {(recipientName || recipientPhone) && (
                  <div className="flex items-start gap-2.5 border-t border-gray-200 pt-2.5">
                    <User className="h-4 w-4 shrink-0 text-gray-300 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Recipient</p>
                      <p className="text-sm font-semibold text-gray-800">{recipientName}</p>
                      {recipientPhone && <p className="text-xs text-gray-500">{recipientPhone}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Shipment type */}
              <div>
                <FieldLabel>Shipment type</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {(['air', 'sea'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setShipmentType(t)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition',
                        shipmentType === t
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      {t === 'air'
                        ? <Send className="h-3.5 w-3.5 shrink-0" />
                        : <Ship className="h-3.5 w-3.5 shrink-0" />}
                      {t === 'air' ? 'Air freight' : 'Sea freight'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight / CBM + Declared value */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>{shipmentType === 'air' ? 'Weight (kg)' : 'Volume (CBM)'}</FieldLabel>
                  <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 focus-within:border-brand-500 transition">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none"
                    />
                    <span className="shrink-0 border-l border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-400">
                      {shipmentType === 'air' ? 'kg' : 'cbm'}
                    </span>
                  </div>
                </div>
                <div>
                  <FieldLabel>Declared value (USD)</FieldLabel>
                  <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 focus-within:border-brand-500 transition">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={declaredValue}
                      onChange={(e) => setDeclaredValue(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none"
                    />
                    <span className="shrink-0 border-l border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-400">
                      USD
                    </span>
                  </div>
                </div>
              </div>

              {/* Contents description */}
              <div>
                <FieldLabel required>Contents description</FieldLabel>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Electronics, clothing..."
                  className={inputCls}
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={isPending}
                leftIcon={!isPending ? <CheckCircle2 className="h-4 w-4" /> : undefined}
              >
                Create order
              </Button>
              <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
