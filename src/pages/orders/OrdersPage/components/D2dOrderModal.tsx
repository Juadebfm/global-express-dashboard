import type { FormEvent, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Truck, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { ApiError } from '@/lib/apiClient';
import { useD2dOrderIntake } from '@/hooks';
import type { D2dOrderSubmission } from '@/types';

interface D2dOrderModalProps {
  onClose: () => void;
  onCreated: (order: D2dOrderSubmission) => void;
}

export function D2dOrderModal({ onClose, onCreated }: D2dOrderModalProps): ReactElement {
  const intake = useD2dOrderIntake();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddressLine1, setDeliveryAddressLine1] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !intake.isPending) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [intake.isPending, onClose]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    try {
      const order = await intake.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        originCountry: originCountry.trim(),
        goodsDescription: goodsDescription.trim(),
        deliveryPhone: deliveryPhone.trim(),
        deliveryAddressLine1: deliveryAddressLine1.trim() || undefined,
        deliveryCity: deliveryCity.trim() || undefined,
        deliveryState: deliveryState.trim() || undefined,
        estimatedWeightKg: estimatedWeightKg.trim() ? Number(estimatedWeightKg) : undefined,
      });
      onCreated(order);
    } catch (submissionError) {
      if (submissionError instanceof ApiError && submissionError.status === 422) {
        setError('Complete your profile before creating a D2D order.');
      } else {
        setError(submissionError instanceof Error ? submissionError.message : 'Could not create your D2D order. Please try again.');
      }
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === overlayRef.current && !intake.isPending) onClose();
      }}
    >
      <form
        className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-d2d-order-title"
        onSubmit={(event) => void submit(event)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <h2 id="create-d2d-order-title" className="text-lg font-semibold text-gray-900">Create D2D order</h2>
              <p className="mt-0.5 text-sm text-gray-500">Create a door-to-door pre-order before your goods arrive at the warehouse.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={intake.isPending}
            aria-label="Close D2D order form"
            className="rounded-xl p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Your full name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            <Input label="Your phone (optional)" value={phone} onChange={(event) => setPhone(event.target.value)} />
            <Input label="Origin country" value={originCountry} onChange={(event) => setOriginCountry(event.target.value)} required />
            <Input label="Recipient phone" value={deliveryPhone} onChange={(event) => setDeliveryPhone(event.target.value)} required />
            <Input label="Delivery address (optional)" value={deliveryAddressLine1} onChange={(event) => setDeliveryAddressLine1(event.target.value)} />
            <Input label="Delivery city (optional)" value={deliveryCity} onChange={(event) => setDeliveryCity(event.target.value)} />
            <Input label="Delivery state (optional)" value={deliveryState} onChange={(event) => setDeliveryState(event.target.value)} />
            <Input label="Estimated weight in kg (optional)" type="number" min="0" step="0.01" value={estimatedWeightKg} onChange={(event) => setEstimatedWeightKg(event.target.value)} />
          </div>
          <div>
            <label htmlFor="d2d-goods-description" className="mb-1.5 block text-sm font-medium text-gray-700">Goods description</label>
            <textarea
              id="d2d-goods-description"
              rows={4}
              required
              value={goodsDescription}
              onChange={(event) => setGoodsDescription(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 hover:border-gray-400 focus:border-brand-500 focus:outline-none"
              placeholder="Describe the goods you want delivered"
            />
          </div>
          {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={intake.isPending}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={intake.isPending} leftIcon={!intake.isPending ? <CheckCircle2 className="h-4 w-4" /> : undefined}>
            Create D2D order
          </Button>
        </div>
      </form>
    </div>
  );
}
