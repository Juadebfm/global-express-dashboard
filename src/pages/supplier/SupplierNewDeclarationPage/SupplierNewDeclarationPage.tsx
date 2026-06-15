import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SupplierLayout } from '@/components/supplier/SupplierLayout';
import { Button, Input } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useCreateDeclaration } from '@/hooks/useSupplierPortal';
import { cn } from '@/utils';
import type { DeclarationShipmentType, NewDeclarationPayload } from '@/types/supplierPortal.types';

const SHIPMENT_TYPES: { value: DeclarationShipmentType; label: string }[] = [
  { value: 'air', label: 'Air freight' },
  { value: 'ocean', label: 'Ocean freight' },
  { value: 'd2d', label: 'Door-to-door' },
];

function FieldGroup({ label, children }: { label: string; children: ReactElement }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{label}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function SupplierNewDeclarationPage(): ReactElement {
  const navigate = useNavigate();
  const { mutateAsync: create, isPending } = useCreateDeclaration();

  const [shipmentType, setShipmentType] = useState<DeclarationShipmentType>('air');
  const [form, setForm] = useState({
    recipientName: '',
    recipientPhone: '',
    recipientEmail: '',
    recipientAddress: '',
    description: '',
    quantity: '',
    declaredValueUsd: '',
    estimatedWeightKg: '',
    estimatedArrivalAt: '',
    specialPackagingNotes: '',
    supplierNotes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.recipientName.trim()) next.recipientName = 'Recipient name is required.';
    if (!form.recipientPhone.trim()) next.recipientPhone = 'Recipient phone is required.';
    if (!form.description.trim()) next.description = 'Description is required.';
    if (!form.declaredValueUsd || isNaN(Number(form.declaredValueUsd)) || Number(form.declaredValueUsd) <= 0) {
      next.declaredValueUsd = 'Please enter a valid declared value (USD).';
    }
    if (shipmentType === 'd2d' && !form.recipientAddress.trim()) {
      next.recipientAddress = 'Recipient address is required for door-to-door shipments.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const payload: NewDeclarationPayload = {
      recipientName: form.recipientName.trim(),
      recipientPhone: form.recipientPhone.trim(),
      description: form.description.trim(),
      declaredValueUsd: Number(form.declaredValueUsd),
      shipmentType,
      ...(form.recipientEmail.trim() && { recipientEmail: form.recipientEmail.trim() }),
      ...(form.recipientAddress.trim() && { recipientAddress: form.recipientAddress.trim() }),
      ...(form.quantity && { quantity: Number(form.quantity) }),
      ...(form.estimatedWeightKg && { estimatedWeightKg: Number(form.estimatedWeightKg) }),
      ...(form.estimatedArrivalAt && { estimatedArrivalAt: form.estimatedArrivalAt }),
      ...(form.specialPackagingNotes.trim() && { specialPackagingNotes: form.specialPackagingNotes.trim() }),
      ...(form.supplierNotes.trim() && { supplierNotes: form.supplierNotes.trim() }),
    };

    try {
      const result = await create(payload);
      navigate(ROUTES.SUPPLIER_GOODS_NOTICE_DETAIL.replace(':id', result.id), { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Failed to submit goods notice. Please check your details and try again.',
      );
    }
  };

  return (
    <SupplierLayout>
      <div className="max-w-xl">
        <button
          type="button"
          onClick={() => navigate(ROUTES.SUPPLIER_DASHBOARD)}
          className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to goods notices
        </button>

        <h1 className="text-xl font-semibold text-gray-900 mb-1">New goods notice</h1>
        <p className="text-sm text-gray-500 mb-6">
          Tell us what you are sending and we will review your goods notice shortly.
        </p>

        {submitError && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7">

          {/* Shipment type */}
          <FieldGroup label="Shipment type">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {SHIPMENT_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setShipmentType(opt.value)}
                  className={cn(
                    'rounded-xl border-2 px-4 py-3 text-left transition-colors',
                    shipmentType === opt.value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                  )}
                >
                  <p className={cn('text-sm font-semibold', shipmentType === opt.value ? 'text-brand-700' : 'text-gray-800')}>
                    {opt.label}
                  </p>
                </button>
              ))}
            </div>
          </FieldGroup>

          {/* Recipient */}
          <FieldGroup label="Recipient">
            <>
              <Input
                label="Full name *"
                type="text"
                placeholder="e.g. Adaobi Nwachukwu"
                value={form.recipientName}
                onChange={(e) => set('recipientName', e.target.value)}
                error={errors.recipientName}
              />
              <Input
                label="Phone number *"
                type="text"
                placeholder="+2348012345678"
                value={form.recipientPhone}
                onChange={(e) => set('recipientPhone', e.target.value)}
                error={errors.recipientPhone}
              />
              <Input
                label="Email (optional)"
                type="email"
                placeholder="recipient@example.com"
                value={form.recipientEmail}
                onChange={(e) => set('recipientEmail', e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Delivery address {shipmentType === 'd2d' ? '*' : '(optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder="Street, city, state"
                  value={form.recipientAddress}
                  onChange={(e) => set('recipientAddress', e.target.value)}
                  className={cn(
                    'w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white resize-none',
                    'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                    errors.recipientAddress ? 'border-red-400' : 'border-gray-300',
                  )}
                />
                {errors.recipientAddress && (
                  <p className="mt-1 text-xs text-red-500">{errors.recipientAddress}</p>
                )}
              </div>
            </>
          </FieldGroup>

          {/* Goods */}
          <FieldGroup label="Goods details">
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. 500 pieces eyeliner, 200 pieces eyeshadow palette"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  className={cn(
                    'w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white resize-none',
                    'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                    errors.description ? 'border-red-400' : 'border-gray-300',
                  )}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-500">{errors.description}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Declared value (USD) *"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.declaredValueUsd}
                  onChange={(e) => set('declaredValueUsd', e.target.value)}
                  error={errors.declaredValueUsd}
                />
                <Input
                  label="Quantity (optional)"
                  type="number"
                  placeholder="0"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Est. weight kg (optional)"
                  type="number"
                  placeholder="0.0"
                  min="0"
                  step="0.1"
                  value={form.estimatedWeightKg}
                  onChange={(e) => set('estimatedWeightKg', e.target.value)}
                />
                <Input
                  label="Est. arrival at warehouse"
                  type="text"
                  value={form.estimatedArrivalAt}
                  onChange={(e) => set('estimatedArrivalAt', e.target.value)}
                />
              </div>
            </>
          </FieldGroup>

          {/* Notes */}
          <FieldGroup label="Additional notes (optional)">
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Special packaging notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Fragile — keep upright"
                  value={form.specialPackagingNotes}
                  onChange={(e) => set('specialPackagingNotes', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your reference / notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Order ref: INV-20260610-A"
                  value={form.supplierNotes}
                  onChange={(e) => set('supplierNotes', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                />
              </div>
            </>
          </FieldGroup>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(ROUTES.SUPPLIER_DASHBOARD)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending} className="flex-1">
              Submit goods notice
            </Button>
          </div>
        </form>
      </div>
    </SupplierLayout>
  );
}
