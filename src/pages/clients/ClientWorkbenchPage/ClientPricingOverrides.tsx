import { useState } from 'react';
import type { ReactElement } from 'react';
import { DollarSign } from 'lucide-react';
import { usePricingRules } from '@/hooks';
import type { CustomerPricingOverride } from '@/types';

function parseRate(val: string | null | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(val);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface OverrideRowProps {
  label: string;
  mode: 'air' | 'sea';
  override: CustomerPricingOverride | null;
  canEdit: boolean;
  onSave: (mode: 'air' | 'sea', rateUsdPerKg: number) => Promise<void>;
  onRemove: (override: CustomerPricingOverride) => Promise<void>;
}

function OverrideRow({ label, mode, override, canEdit, onSave, onRemove }: OverrideRowProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const existingRate = parseRate(override?.rateUsdPerKg);

  const handleEdit = (): void => {
    setRate(existingRate !== null ? String(existingRate) : '');
    setEditing(true);
  };

  const handleSave = async (): Promise<void> => {
    const n = parseFloat(rate);
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    try {
      await onSave(mode, n);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (): Promise<void> => {
    if (!override) return;
    setRemoving(true);
    try {
      await onRemove(override);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        {editing ? (
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              min="0.01"
              step="0.01"
              placeholder="0.00"
              autoFocus
              className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-xs text-gray-400">$/kg</span>
          </div>
        ) : existingRate !== null ? (
          <p className="mt-0.5 text-base font-semibold text-gray-900">
            ${existingRate.toFixed(2)}{' '}
            <span className="text-xs font-normal text-gray-400">per kg</span>
          </p>
        ) : (
          <p className="mt-0.5 text-sm italic text-gray-400">No custom rate — using default</p>
        )}
      </div>

      {canEdit && (
        <div className="flex shrink-0 items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => { void handleSave().catch(() => {}); }}
                disabled={saving}
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleEdit}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                {existingRate !== null ? 'Edit' : 'Set rate'}
              </button>
              {override && (
                <button
                  type="button"
                  onClick={() => { void handleRemove().catch(() => {}); }}
                  disabled={removing}
                  className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  {removing ? 'Removing…' : 'Remove'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface ClientPricingOverridesProps {
  clientId: string;
  canEdit: boolean;
}

export function ClientPricingOverrides({ clientId, canEdit }: ClientPricingOverridesProps): ReactElement {
  const pricing = usePricingRules({ customerId: clientId });
  const [error, setError] = useState<string | null>(null);

  const overrides = pricing.data?.customerOverrides ?? [];
  const airOverride = overrides.find((o) => o.mode === 'air' && o.isActive) ?? null;
  const seaOverride = overrides.find((o) => o.mode === 'sea' && o.isActive) ?? null;

  const handleSave = async (mode: 'air' | 'sea', rateUsdPerKg: number): Promise<void> => {
    setError(null);
    const existing = mode === 'air' ? airOverride : seaOverride;
    try {
      await pricing.update({
        customerOverrides: [
          {
            ...(existing ? { id: existing.id } : {}),
            customerId: clientId,
            mode,
            rateUsdPerKg,
            isActive: true,
          },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rate');
      throw err;
    }
  };

  const handleRemove = async (override: CustomerPricingOverride): Promise<void> => {
    setError(null);
    try {
      await pricing.update({ deleteCustomerOverrideIds: [override.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove rate');
      throw err;
    }
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Custom pricing</h2>
            <p className="text-sm text-gray-500">
              {canEdit
                ? 'Per-kg rates that override the default pricing for this client.'
                : 'Custom rates applied to this client.'}
            </p>
          </div>
        </div>
        {!canEdit && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            Superadmin only
          </span>
        )}
      </div>

      {pricing.isLoading ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
          Loading…
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}
          <OverrideRow
            label="Air"
            mode="air"
            override={airOverride}
            canEdit={canEdit}
            onSave={handleSave}
            onRemove={handleRemove}
          />
          <OverrideRow
            label="Sea"
            mode="sea"
            override={seaOverride}
            canEdit={canEdit}
            onSave={handleSave}
            onRemove={handleRemove}
          />
        </div>
      )}
    </div>
  );
}
