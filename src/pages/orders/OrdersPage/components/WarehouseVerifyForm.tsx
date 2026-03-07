import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils';
import type { SpecialPackagingType, RestrictedGood } from '@/types';
import type { OrderView, PackageForm } from '../types';
import { newPackageForm, mapPackageForm, parsePositive, toIso } from '../types';

interface WarehouseVerifyFormProps {
  view: OrderView;
  canApproveOverride: boolean;
  isPending: boolean;
  packagingTypes: SpecialPackagingType[];
  restrictedGoods: RestrictedGood[];
  packagingError: string | null;
  restrictedError: string | null;
  onSubmit: (payload: {
    transportMode: 'air' | 'sea';
    departureDate?: string;
    packages: ReturnType<typeof mapPackageForm>[];
    manualFinalChargeUsd?: number;
    manualAdjustmentReason?: string;
  }) => Promise<{ finalChargeUsd: number }>;
}

function FormField({ label, children }: { label: string; children: ReactElement }): ReactElement {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'number';
  min?: string;
  step?: string;
}): ReactElement {
  return (
    <FormField label={label}>
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
      />
    </FormField>
  );
}

export function WarehouseVerifyForm({
  view,
  canApproveOverride,
  isPending,
  packagingTypes,
  restrictedGoods,
  packagingError,
  restrictedError,
  onSubmit,
}: WarehouseVerifyFormProps): ReactElement {
  const { t } = useTranslation('orders');

  const [transportMode, setTransportMode] = useState<'air' | 'sea'>(
    (view.transportMode || view.shipmentType || 'air') === 'sea' ? 'sea' : 'air',
  );
  const [departureDate, setDepartureDate] = useState('');
  const [manualCharge, setManualCharge] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [packages, setPackages] = useState<PackageForm[]>([newPackageForm(1)]);
  const [nextId, setNextId] = useState(2);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (id: number, key: keyof PackageForm, value: string | boolean): void => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setNotice(null);
    setError(null);

    if (packages.some((p) => p.isRestricted && !p.restrictedReason.trim())) {
      setError(t('warehouse.errors.restrictedReason'));
      return;
    }
    if (!canApproveOverride && packages.some((p) => p.restrictedOverrideApproved)) {
      setError(t('warehouse.errors.overridePermission'));
      return;
    }
    const manualFinalChargeUsd = manualCharge.trim() ? parsePositive(manualCharge) : undefined;
    if (manualFinalChargeUsd !== undefined && !manualReason.trim()) {
      setError(t('warehouse.errors.manualReasonRequired'));
      return;
    }
    try {
      const result = await onSubmit({
        transportMode,
        departureDate: toIso(departureDate),
        packages: packages.map(mapPackageForm),
        manualFinalChargeUsd,
        manualAdjustmentReason: manualReason.trim() || undefined,
      });
      setNotice(t('warehouse.success', { charge: formatCurrency(result.finalChargeUsd, 'USD') }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('warehouse.errors.failed'));
    }
  };

  return (
    <form className="rounded-2xl border border-gray-200 bg-white p-5" onSubmit={(e) => void handleSubmit(e)}>
      <h3 className="text-base font-semibold text-gray-900">{t('warehouse.title')}</h3>
      <p className="mt-1 text-sm text-gray-500">{t('warehouse.subtitle')}</p>

      {restrictedError && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{restrictedError}</p>
      )}
      {packagingError && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{packagingError}</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormField label={t('warehouse.transportMode')}>
          <select
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value as 'air' | 'sea')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            <option value="air">{t('warehouse.air')}</option>
            <option value="sea">{t('warehouse.sea')}</option>
          </select>
        </FormField>
        <FormField label={t('warehouse.departureDate')}>
          <input
            type="datetime-local"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </FormField>
        <FormInput label={t('warehouse.manualCharge')} type="number" min="0" step="0.01" value={manualCharge} onChange={setManualCharge} />
        <FormInput label={t('warehouse.manualReason')} value={manualReason} onChange={setManualReason} />
      </div>

      {/* Packages */}
      <div className="mt-4 space-y-4">
        {packages.map((pkg, index) => (
          <div key={pkg.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {t('warehouse.packageN', { n: index + 1 })}
              </p>
              {packages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPackages((prev) => prev.filter((p) => p.id !== pkg.id))}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  {t('warehouse.remove')}
                </button>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <FormInput label={t('warehouse.description')} value={pkg.description} onChange={(v) => handleChange(pkg.id, 'description', v)} />
              <FormInput label={t('warehouse.itemType')} value={pkg.itemType} onChange={(v) => handleChange(pkg.id, 'itemType', v)} />
              <FormInput label={t('warehouse.quantity')} type="number" min="1" value={pkg.quantity} onChange={(v) => handleChange(pkg.id, 'quantity', v)} />
              <FormInput label={t('warehouse.lengthCm')} type="number" min="0" step="0.01" value={pkg.lengthCm} onChange={(v) => handleChange(pkg.id, 'lengthCm', v)} />
              <FormInput label={t('warehouse.widthCm')} type="number" min="0" step="0.01" value={pkg.widthCm} onChange={(v) => handleChange(pkg.id, 'widthCm', v)} />
              <FormInput label={t('warehouse.heightCm')} type="number" min="0" step="0.01" value={pkg.heightCm} onChange={(v) => handleChange(pkg.id, 'heightCm', v)} />
              <FormInput label={t('warehouse.weightKg')} type="number" min="0" step="0.01" value={pkg.weightKg} onChange={(v) => handleChange(pkg.id, 'weightKg', v)} />
              <FormInput label={t('warehouse.cbm')} type="number" min="0" step="0.0001" value={pkg.cbm} onChange={(v) => handleChange(pkg.id, 'cbm', v)} />
              <FormField label={t('warehouse.specialPackaging')}>
                <select
                  value={pkg.specialPackagingType}
                  onChange={(e) => handleChange(pkg.id, 'specialPackagingType', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  <option value="">{t('warehouse.none')}</option>
                  {packagingTypes.map((item) => (
                    <option key={item.type} value={item.type}>{item.label}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Restricted item section */}
            <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={pkg.isRestricted}
                  onChange={(e) => handleChange(pkg.id, 'isRestricted', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {t('warehouse.restrictedItem')}
              </label>
              {pkg.isRestricted && (
                <>
                  <FormInput label={t('warehouse.restrictedReason')} value={pkg.restrictedReason} onChange={(v) => handleChange(pkg.id, 'restrictedReason', v)} />
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={pkg.restrictedOverrideApproved}
                      disabled={!canApproveOverride}
                      onChange={(e) => handleChange(pkg.id, 'restrictedOverrideApproved', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 disabled:cursor-not-allowed"
                    />
                    {t('warehouse.overrideApproved')}
                  </label>
                  {!canApproveOverride && (
                    <p className="text-xs text-amber-700">{t('warehouse.overrideAdminOnly')}</p>
                  )}
                  {pkg.restrictedOverrideApproved && (
                    <FormInput label={t('warehouse.overrideReason')} value={pkg.restrictedOverrideReason} onChange={(v) => handleChange(pkg.id, 'restrictedOverrideReason', v)} />
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => {
            const id = nextId;
            setNextId((prev) => prev + 1);
            setPackages((prev) => [...prev, newPackageForm(id)]);
          }}
        >
          {t('warehouse.addPackage')}
        </Button>
        <Button type="submit" size="sm" isLoading={isPending}>
          {t('warehouse.submit')}
        </Button>
      </div>

      {notice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {(restrictedGoods.length ?? 0) > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          {t('warehouse.catalogLoaded', { count: restrictedGoods.length })}
        </p>
      )}
    </form>
  );
}
