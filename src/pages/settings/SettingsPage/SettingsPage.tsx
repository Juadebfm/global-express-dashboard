import type { ReactElement, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { AlertBanner, ConfirmModal } from '@/components/ui';
import { MfaSettingsCard } from '@/components/auth';
import {
  useAuth,
  useCan,
  useChangePassword,
  useDashboardData,
  useFxRate,
  useLogisticsSettings,
  useMyNotificationPreferences,
  useNotificationTemplates,
  usePricingRules,
  useRestrictedGoods,
  useSearch,
  useShipmentTypesCatalog,
  useUpdateShipmentTypesCatalog,
} from '@/hooks';
import { AppShell, PageHeader } from '@/pages/shared';
import { deleteMyAccount, exportMyAccountData, getOnboardingSettings, updateOnboardingSettings } from '@/services';
import type {
  EtaNotes,
  NotificationTemplate,
  OfficeInfo,
  PricingRule,
  ProfileRequirements,
  RestrictedGood,
  ShipmentTypeCatalogItem,
} from '@/types';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

/* ── Types ───────────────────────────────────────────────────── */

type SettingsTab =
  | 'general'
  | 'fx'
  | 'pricing'
  | 'restricted-goods'
  | 'shipment-types'
  | 'logistics'
  | 'notification-templates';

const OPERATOR_TAB_IDS: SettingsTab[] = [
  'general',
  'fx',
  'pricing',
  'restricted-goods',
  'shipment-types',
  'logistics',
  'notification-templates',
];

const TAB_FALLBACK_LABEL: Record<SettingsTab, string> = {
  general: 'General',
  fx: 'FX Rate',
  pricing: 'Pricing',
  'restricted-goods': 'Restricted Goods',
  'shipment-types': 'Shipment Types',
  logistics: 'Logistics',
  'notification-templates': 'Templates',
};

/* ── Shared sub-components ───────────────────────────────────── */

function SettingsField({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="flex items-start justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="text-sm text-gray-500">{value || '—'}</span>
    </div>
  );
}

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      {children}
    </section>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  disabled,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}): ReactElement {
  return (
    <label className="flex flex-col text-xs">
      <span className="font-medium text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-400"
      />
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition',
        checked ? 'bg-brand-500' : 'bg-gray-200',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all',
          checked ? 'left-6' : 'left-1',
        )}
      />
    </button>
  );
}

function SaveBar({
  onSave,
  isPending,
  error,
  success,
}: {
  onSave: () => void;
  isPending: boolean;
  error?: Error | null;
  success?: boolean;
}): ReactElement {
  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      {error && (
        <div className="mb-3">
          <AlertBanner tone="error" message={error.message} />
        </div>
      )}
      {success && (
        <div className="mb-3">
          <AlertBanner tone="success" message="Saved successfully." />
        </div>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={onSave}
        className={cn(
          'rounded-xl px-5 py-2 text-sm font-semibold text-white transition',
          isPending ? 'cursor-not-allowed bg-gray-400' : 'bg-brand-500 hover:bg-brand-600',
        )}
      >
        {isPending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

/* ── FX Rate section ─────────────────────────────────────────── */

function FxRateEditor({
  initialMode,
  initialManualRate,
  canEdit,
  onSave,
  isPending,
  updateError,
  effectiveRate,
}: {
  initialMode: 'live' | 'manual';
  initialManualRate: number | null | undefined;
  canEdit: boolean;
  onSave: (p: { mode: 'live' | 'manual'; manualRate?: number | null }) => Promise<unknown>;
  isPending: boolean;
  updateError: Error | null;
  effectiveRate?: number | null;
}): ReactElement {
  const [mode, setMode] = useState<'live' | 'manual'>(initialMode);
  const [manualRate, setManualRate] = useState(initialManualRate != null ? String(initialManualRate) : '');
  const [success, setSuccess] = useState(false);

  const handleSave = async (): Promise<void> => {
    setSuccess(false);
    const payload: { mode: 'live' | 'manual'; manualRate?: number | null } = { mode };
    if (mode === 'manual') {
      const parsed = parseFloat(manualRate);
      if (!isFinite(parsed) || parsed <= 0) return;
      payload.manualRate = parsed;
    } else {
      payload.manualRate = null;
    }
    await onSave(payload);
    setSuccess(true);
  };

  return (
    <div className="mt-4 space-y-3">
      <SettingsField
        label="Effective rate"
        value={effectiveRate != null ? `₦${effectiveRate.toFixed(4)} per $1` : '—'}
      />
      <SettingsField
        label="Current mode"
        value={mode === 'live' ? 'Live (auto-updated)' : 'Manual override'}
      />
      {canEdit && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Edit</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'live' | 'manual')}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500"
              >
                <option value="live">Live (Paystack auto-rate)</option>
                <option value="manual">Manual override</option>
              </select>
            </div>
            {mode === 'manual' && (
              <FieldInput
                label="Manual rate (₦ per $1)"
                type="number"
                value={manualRate}
                onChange={setManualRate}
                placeholder="e.g. 1500"
              />
            )}
          </div>
          <SaveBar onSave={() => void handleSave()} isPending={isPending} error={updateError} success={success} />
        </div>
      )}
    </div>
  );
}

function FxRateSection({ canEdit }: { canEdit: boolean }): ReactElement {
  const fxRate = useFxRate();
  return (
    <SectionShell title="FX Rate Settings" subtitle="USD → NGN exchange rate configuration.">
      {fxRate.isLoading && (
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Loading…</div>
      )}
      {fxRate.error && (
        <div className="mt-4">
          <AlertBanner tone="error" message={fxRate.error instanceof Error ? fxRate.error.message : 'Failed to load'} />
        </div>
      )}
      {fxRate.data && (
        <FxRateEditor
          key={`${fxRate.data.mode}-${String(fxRate.data.manualRate)}`}
          initialMode={fxRate.data.mode}
          initialManualRate={fxRate.data.manualRate}
          effectiveRate={fxRate.data.effectiveRate}
          canEdit={canEdit}
          onSave={fxRate.update}
          isPending={fxRate.isUpdating}
          updateError={fxRate.updateError instanceof Error ? fxRate.updateError : null}
        />
      )}
    </SectionShell>
  );
}

/* ── Pricing section ─────────────────────────────────────────── */

interface EditablePricingRule extends Partial<PricingRule> {
  _isNew?: boolean;
  _markedForDelete?: boolean;
}

function PricingSection({ canEdit }: { canEdit: boolean }): ReactElement {
  const pricing = usePricingRules({ includeInactive: true });
  const [success, setSuccess] = useState(false);

  if (pricing.isLoading) {
    return (
      <SectionShell title="Pricing Rules" subtitle="Rate configuration for air and sea freight.">
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Loading…</div>
      </SectionShell>
    );
  }
  if (pricing.error) {
    return (
      <SectionShell title="Pricing Rules" subtitle="Rate configuration for air and sea freight.">
        <div className="mt-4"><AlertBanner tone="error" message={pricing.error instanceof Error ? pricing.error.message : 'Failed to load'} /></div>
      </SectionShell>
    );
  }

  return (
    <PricingEditor
      key={(pricing.data ?? []).map((r) => r.id).join(',')}
      initialRules={pricing.data ?? []}
      canEdit={canEdit}
      onSave={async (payload) => {
        setSuccess(false);
        await pricing.update(payload);
        setSuccess(true);
      }}
      isPending={pricing.isUpdating}
      updateError={pricing.updateError instanceof Error ? pricing.updateError : null}
      success={success}
    />
  );
}

function PricingEditor({
  initialRules,
  canEdit,
  onSave,
  isPending,
  updateError,
  success,
}: {
  initialRules: PricingRule[];
  canEdit: boolean;
  onSave: (p: { defaultRules: Omit<PricingRule, 'id'>[]; deleteDefaultRuleIds: string[] }) => Promise<void>;
  isPending: boolean;
  updateError: Error | null;
  success: boolean;
}): ReactElement {
  const [rows, setRows] = useState<EditablePricingRule[]>(() => initialRules.map((r) => ({ ...r })));

  const update = (i: number, patch: Partial<EditablePricingRule>): void =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleAdd = (): void =>
    setRows((prev) => [
      ...prev,
      { name: '', mode: 'air', isActive: true, rateUsdPerKg: undefined, _isNew: true },
    ]);

  const handleSave = async (): Promise<void> => {
    const toDelete = rows.filter((r) => r._markedForDelete && r.id).map((r) => r.id as string);
    const toKeep = rows
      .filter((r) => !r._markedForDelete)
      .map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        name: r.name ?? '',
        mode: r.mode ?? 'air',
        isActive: r.isActive ?? true,
        ...(r.minWeightKg != null ? { minWeightKg: r.minWeightKg } : {}),
        ...(r.maxWeightKg != null ? { maxWeightKg: r.maxWeightKg } : {}),
        ...(r.rateUsdPerKg != null ? { rateUsdPerKg: r.rateUsdPerKg } : {}),
        ...(r.flatRateUsdPerCbm != null ? { flatRateUsdPerCbm: r.flatRateUsdPerCbm } : {}),
      })) as Omit<PricingRule, 'id'>[];
    await onSave({ defaultRules: toKeep, deleteDefaultRuleIds: toDelete });
  };

  return (
    <SectionShell title="Pricing Rules" subtitle="Rate configuration for air and sea freight.">
      <div className="mt-4 space-y-3">
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
            No pricing rules configured.
          </div>
        )}
        {rows.map((row, i) => (
          <div
            key={row.id ?? `new-${i}`}
            className={cn(
              'rounded-xl border border-gray-200 bg-gray-50 p-4',
              row._markedForDelete && 'opacity-40',
            )}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FieldInput label="Name" value={row.name ?? ''} onChange={(v) => update(i, { name: v })} disabled={!canEdit || row._markedForDelete} />
              <div>
                <label className="block text-xs font-medium text-gray-700">Mode</label>
                <select
                  disabled={!canEdit || row._markedForDelete}
                  value={row.mode ?? 'air'}
                  onChange={(e) => update(i, { mode: e.target.value as 'air' | 'sea' })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:bg-gray-100"
                >
                  <option value="air">Air</option>
                  <option value="sea">Sea</option>
                </select>
              </div>
              <FieldInput label="Rate ($/kg)" type="number" value={row.rateUsdPerKg != null ? String(row.rateUsdPerKg) : ''} onChange={(v) => update(i, { rateUsdPerKg: v ? parseFloat(v) : undefined })} disabled={!canEdit || row._markedForDelete} placeholder="0.00" />
              <FieldInput label="Rate ($/CBM)" type="number" value={row.flatRateUsdPerCbm != null ? String(row.flatRateUsdPerCbm) : ''} onChange={(v) => update(i, { flatRateUsdPerCbm: v ? parseFloat(v) : undefined })} disabled={!canEdit || row._markedForDelete} placeholder="0.00" />
              <FieldInput label="Min weight (kg)" type="number" value={row.minWeightKg != null ? String(row.minWeightKg) : ''} onChange={(v) => update(i, { minWeightKg: v ? parseFloat(v) : undefined })} disabled={!canEdit || row._markedForDelete} placeholder="0" />
              <FieldInput label="Max weight (kg)" type="number" value={row.maxWeightKg != null ? String(row.maxWeightKg) : ''} onChange={(v) => update(i, { maxWeightKg: v ? parseFloat(v) : undefined })} disabled={!canEdit || row._markedForDelete} placeholder="∞" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={row.isActive ?? true}
                  disabled={!canEdit || row._markedForDelete}
                  onChange={(e) => update(i, { isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Active
              </label>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => update(i, { _markedForDelete: !row._markedForDelete })}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                    row._markedForDelete
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
                  )}
                >
                  {row._markedForDelete ? 'Undo' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {canEdit && (
        <>
          <div className="mt-3">
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              + Add rule
            </button>
          </div>
          <SaveBar onSave={() => void handleSave()} isPending={isPending} error={updateError} success={success} />
        </>
      )}
    </SectionShell>
  );
}

/* ── Restricted Goods section ────────────────────────────────── */

interface EditableGood extends Partial<RestrictedGood> {
  _isNew?: boolean;
  _markedForDelete?: boolean;
}

function RestrictedGoodsSection({ canEdit }: { canEdit: boolean }): ReactElement {
  const goods = useRestrictedGoods({ includeInactive: true });
  const [success, setSuccess] = useState(false);

  if (goods.isLoading) {
    return (
      <SectionShell title="Restricted Goods" subtitle="Catalog of restricted or hazardous items flagged at intake.">
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Loading…</div>
      </SectionShell>
    );
  }
  if (goods.error) {
    return (
      <SectionShell title="Restricted Goods" subtitle="Catalog of restricted or hazardous items flagged at intake.">
        <div className="mt-4"><AlertBanner tone="error" message={goods.error instanceof Error ? goods.error.message : 'Failed to load'} /></div>
      </SectionShell>
    );
  }

  return (
    <RestrictedGoodsEditor
      key={(goods.data ?? []).map((g) => g.id).join(',')}
      initialItems={goods.data ?? []}
      canEdit={canEdit}
      onSave={async (payload) => {
        setSuccess(false);
        await goods.update(payload);
        setSuccess(true);
      }}
      isPending={goods.isUpdating}
      updateError={goods.updateError instanceof Error ? goods.updateError : null}
      success={success}
    />
  );
}

function RestrictedGoodsEditor({
  initialItems,
  canEdit,
  onSave,
  isPending,
  updateError,
  success,
}: {
  initialItems: RestrictedGood[];
  canEdit: boolean;
  onSave: (p: { items: Partial<RestrictedGood>[]; deleteIds: string[] }) => Promise<void>;
  isPending: boolean;
  updateError: Error | null;
  success: boolean;
}): ReactElement {
  const [rows, setRows] = useState<EditableGood[]>(() => initialItems.map((g) => ({ ...g })));

  const update = (i: number, patch: Partial<EditableGood>): void =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleAdd = (): void =>
    setRows((prev) => [
      ...prev,
      { code: '', nameEn: '', nameKo: '', description: '', allowWithOverride: false, isActive: true, _isNew: true },
    ]);

  const handleSave = async (): Promise<void> => {
    const toDelete = rows.filter((r) => r._markedForDelete && r.id).map((r) => r.id as string);
    const toKeep = rows
      .filter((r) => !r._markedForDelete)
      .map((r) => ({
        id: r.id,
        code: r.code,
        nameEn: r.nameEn,
        nameKo: r.nameKo,
        description: r.description,
        allowWithOverride: r.allowWithOverride,
        isActive: r.isActive,
      }));
    await onSave({ items: toKeep, deleteIds: toDelete });
  };

  return (
    <SectionShell title="Restricted Goods" subtitle="Catalog of restricted or hazardous items flagged at intake.">
      <div className="mt-4 space-y-3">
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
            No restricted goods configured.
          </div>
        )}
        {rows.map((row, i) => (
          <div
            key={row.id ?? `new-${i}`}
            className={cn('rounded-xl border border-gray-200 bg-gray-50 p-4', row._markedForDelete && 'opacity-40')}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FieldInput label="Code" value={row.code ?? ''} onChange={(v) => update(i, { code: v })} disabled={!canEdit || row._markedForDelete} placeholder="e.g. FLAMMABLE" />
              <FieldInput label="Name (EN)" value={row.nameEn ?? ''} onChange={(v) => update(i, { nameEn: v })} disabled={!canEdit || row._markedForDelete} />
              <FieldInput label="Name (KO)" value={row.nameKo ?? ''} onChange={(v) => update(i, { nameKo: v })} disabled={!canEdit || row._markedForDelete} />
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700">Description</label>
              <textarea
                rows={2}
                disabled={!canEdit || row._markedForDelete}
                value={row.description ?? ''}
                onChange={(e) => update(i, { description: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 disabled:bg-gray-100 resize-none"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" checked={row.isActive ?? true} disabled={!canEdit || row._markedForDelete} onChange={(e) => update(i, { isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                  Active
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" checked={row.allowWithOverride ?? false} disabled={!canEdit || row._markedForDelete} onChange={(e) => update(i, { allowWithOverride: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                  Allow with override
                </label>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => update(i, { _markedForDelete: !row._markedForDelete })}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition', row._markedForDelete ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-rose-50 text-rose-700 hover:bg-rose-100')}
                >
                  {row._markedForDelete ? 'Undo' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {canEdit && (
        <>
          <div className="mt-3">
            <button type="button" onClick={handleAdd} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
              + Add item
            </button>
          </div>
          <SaveBar onSave={() => void handleSave()} isPending={isPending} error={updateError} success={success} />
        </>
      )}
    </SectionShell>
  );
}

/* ── Logistics section ───────────────────────────────────────── */

interface LaneState { originCountry: string; originCity: string; destinationCountry: string; destinationCity: string; isLocked: boolean }
const EMPTY_LANE: LaneState = { originCountry: '', originCity: '', destinationCountry: '', destinationCity: '', isLocked: false };
const EMPTY_OFFICE: OfficeInfo = { nameEn: '', nameKo: '', addressEn: '', addressKo: '', phone: '' };
const EMPTY_ETA: EtaNotes = { airLeadTimeNote: '', seaLeadTimeNote: '' };

function LogisticsEditor({
  data,
  canEdit,
  canEditOffices,
  onSave,
  isPending,
  updateError,
}: {
  data: { lane?: Partial<LaneState>; koreaOffice?: Partial<OfficeInfo>; lagosOffice?: Partial<OfficeInfo>; etaNotes?: Partial<EtaNotes> };
  canEdit: boolean;
  canEditOffices: boolean;
  onSave: (p: Record<string, unknown>) => Promise<unknown>;
  isPending: boolean;
  updateError: Error | null;
}): ReactElement {
  const [lane, setLane] = useState<LaneState>({ ...EMPTY_LANE, ...data.lane });
  const [korea, setKorea] = useState<OfficeInfo>({ ...EMPTY_OFFICE, ...data.koreaOffice });
  const [lagos, setLagos] = useState<OfficeInfo>({ ...EMPTY_OFFICE, ...data.lagosOffice });
  const [etaNotes, setEtaNotes] = useState<EtaNotes>({ ...EMPTY_ETA, ...data.etaNotes });
  const [success, setSuccess] = useState(false);

  const handleSave = async (): Promise<void> => {
    setSuccess(false);
    const payload: Record<string, unknown> = {};
    if (canEdit) { payload.lane = lane; payload.etaNotes = etaNotes; }
    if (canEditOffices) { payload.koreaOffice = korea; payload.lagosOffice = lagos; }
    await onSave(payload);
    setSuccess(true);
  };

  return (
    <div className="mt-4 space-y-5">
      {/* Lane */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Shipping lane</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput label="Origin country" value={lane.originCountry} onChange={(v) => setLane((p) => ({ ...p, originCountry: v }))} disabled={!canEdit} />
          <FieldInput label="Origin city" value={lane.originCity} onChange={(v) => setLane((p) => ({ ...p, originCity: v }))} disabled={!canEdit} />
          <FieldInput label="Destination country" value={lane.destinationCountry} onChange={(v) => setLane((p) => ({ ...p, destinationCountry: v }))} disabled={!canEdit} />
          <FieldInput label="Destination city" value={lane.destinationCity} onChange={(v) => setLane((p) => ({ ...p, destinationCity: v }))} disabled={!canEdit} />
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-700">
          <input type="checkbox" checked={lane.isLocked} disabled={!canEdit} onChange={(e) => setLane((p) => ({ ...p, isLocked: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
          Lane locked (no new shipments)
        </label>
      </div>

      {/* ETA Notes */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">ETA lead time notes</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput label="Air lead time note" value={etaNotes.airLeadTimeNote} onChange={(v) => setEtaNotes((p) => ({ ...p, airLeadTimeNote: v }))} disabled={!canEdit} placeholder="e.g. 5–7 business days" />
          <FieldInput label="Sea lead time note" value={etaNotes.seaLeadTimeNote} onChange={(v) => setEtaNotes((p) => ({ ...p, seaLeadTimeNote: v }))} disabled={!canEdit} placeholder="e.g. 4–6 weeks" />
        </div>
      </div>

      {/* Korea Office */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Korea office</p>
          {!canEditOffices && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Superadmin only</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput label="Name (EN)" value={korea.nameEn} onChange={(v) => setKorea((p) => ({ ...p, nameEn: v }))} disabled={!canEditOffices} />
          <FieldInput label="Name (KO)" value={korea.nameKo} onChange={(v) => setKorea((p) => ({ ...p, nameKo: v }))} disabled={!canEditOffices} />
          <FieldInput label="Address (EN)" value={korea.addressEn} onChange={(v) => setKorea((p) => ({ ...p, addressEn: v }))} disabled={!canEditOffices} />
          <FieldInput label="Address (KO)" value={korea.addressKo} onChange={(v) => setKorea((p) => ({ ...p, addressKo: v }))} disabled={!canEditOffices} />
          <FieldInput label="Phone" value={korea.phone} onChange={(v) => setKorea((p) => ({ ...p, phone: v }))} disabled={!canEditOffices} />
        </div>
      </div>

      {/* Lagos Office */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lagos office</p>
          {!canEditOffices && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Superadmin only</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput label="Name (EN)" value={lagos.nameEn} onChange={(v) => setLagos((p) => ({ ...p, nameEn: v }))} disabled={!canEditOffices} />
          <FieldInput label="Name (KO)" value={lagos.nameKo} onChange={(v) => setLagos((p) => ({ ...p, nameKo: v }))} disabled={!canEditOffices} />
          <FieldInput label="Address (EN)" value={lagos.addressEn} onChange={(v) => setLagos((p) => ({ ...p, addressEn: v }))} disabled={!canEditOffices} />
          <FieldInput label="Address (KO)" value={lagos.addressKo} onChange={(v) => setLagos((p) => ({ ...p, addressKo: v }))} disabled={!canEditOffices} />
          <FieldInput label="Phone" value={lagos.phone} onChange={(v) => setLagos((p) => ({ ...p, phone: v }))} disabled={!canEditOffices} />
        </div>
      </div>

      {(canEdit || canEditOffices) && (
        <SaveBar onSave={() => void handleSave()} isPending={isPending} error={updateError} success={success} />
      )}
    </div>
  );
}

function LogisticsSection({
  canEdit,
  canEditOffices,
}: {
  canEdit: boolean;
  canEditOffices: boolean;
}): ReactElement {
  const logistics = useLogisticsSettings();

  if (logistics.isLoading) {
    return (
      <SectionShell title="Logistics Configuration" subtitle="Lane, office addresses and ETA lead time notes.">
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Loading…</div>
      </SectionShell>
    );
  }
  if (logistics.error) {
    return (
      <SectionShell title="Logistics Configuration" subtitle="Lane, office addresses and ETA lead time notes.">
        <div className="mt-4"><AlertBanner tone="error" message={logistics.error instanceof Error ? logistics.error.message : 'Failed to load'} /></div>
      </SectionShell>
    );
  }

  return (
    <SectionShell title="Logistics Configuration" subtitle="Lane, office addresses and ETA lead time notes.">
      <LogisticsEditor
        key={logistics.data?.updatedAt ?? 'logistics'}
        data={logistics.data ?? {}}
        canEdit={canEdit}
        canEditOffices={canEditOffices}
        onSave={logistics.update as (p: Record<string, unknown>) => Promise<unknown>}
        isPending={logistics.isUpdating}
        updateError={logistics.updateError instanceof Error ? logistics.updateError : null}
      />
    </SectionShell>
  );
}

/* ── Notification Templates section ─────────────────────────── */

function NotificationTemplatesSection({ canEdit }: { canEdit: boolean }): ReactElement {
  const [channel, setChannel] = useState('');
  const [locale, setLocale] = useState('');
  const templates = useNotificationTemplates({ channel: channel || undefined, locale: locale || undefined });

  return (
    <SectionShell
      title="Notification Templates"
      subtitle="Email and in-app message templates. Edit subject, body, and active state."
    >
      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500"
          >
            <option value="">All</option>
            <option value="email">Email</option>
            <option value="in_app">In-app</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Locale</label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500"
          >
            <option value="">All</option>
            <option value="en">English</option>
            <option value="ko">Korean</option>
          </select>
        </div>
      </div>

      {templates.isLoading && (
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Loading…</div>
      )}
      {templates.error && (
        <div className="mt-4">
          <AlertBanner tone="error" message={templates.error instanceof Error ? templates.error.message : 'Failed to load'} />
        </div>
      )}
      {templates.data && templates.data.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
          No templates found.
        </div>
      )}
      {templates.data && templates.data.length > 0 && (
        <div className="mt-4 space-y-3">
          {templates.data.map((tpl) => (
            <TemplateRow
              key={tpl.id}
              template={tpl}
              canEdit={canEdit}
              onSave={async (patch) => { await templates.updateOne({ id: tpl.id, ...patch }); }}
              isSaving={templates.isUpdating}
            />
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function TemplateRow({
  template,
  canEdit,
  onSave,
  isSaving,
}: {
  template: NotificationTemplate;
  canEdit: boolean;
  onSave: (patch: Partial<NotificationTemplate>) => Promise<void>;
  isSaving: boolean;
}): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [isActive, setIsActive] = useState(template.isActive);
  const [success, setSuccess] = useState(false);

  const handleSave = async (): Promise<void> => {
    setSuccess(false);
    await onSave({ subject, body, isActive });
    setSuccess(true);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50">
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{template.templateKey}</span>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">{template.channel}</span>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">{template.locale.toUpperCase()}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', template.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
            {template.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <span className="text-xs text-gray-400">{expanded ? 'Collapse ▲' : 'Edit ▼'}</span>
      </button>

      {/* Edit panel */}
      {expanded && (
        <div className="border-t border-gray-200 px-4 pb-4 pt-3">
          <div className="space-y-3">
            <FieldInput label="Subject" value={subject} onChange={setSubject} disabled={!canEdit} />
            <div>
              <label className="block text-xs font-medium text-gray-700">Body</label>
              <textarea
                rows={6}
                disabled={!canEdit}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-800 outline-none focus:border-brand-500 disabled:bg-gray-100 resize-y"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-gray-700">
              <Toggle checked={isActive} onChange={setIsActive} disabled={!canEdit} label="Active" />
              <span>{isActive ? 'Active' : 'Inactive'}</span>
            </label>
          </div>
          {canEdit && (
            <SaveBar onSave={() => void handleSave()} isPending={isSaving} success={success} />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Shipment Types section (unchanged logic, extracted) ─────── */

interface ShipmentTypesSectionProps { canEdit: boolean }
interface EditableRow extends ShipmentTypeCatalogItem { _markedForDelete?: boolean; _isNew?: boolean }

function ShipmentTypesSection({ canEdit }: ShipmentTypesSectionProps): ReactElement {
  const catalog = useShipmentTypesCatalog();
  if (catalog.isLoading) {
    return (
      <SectionShell title="Shipment Types Catalog" subtitle="Controls shipment types shown on the public calculator and intake flows.">
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Loading shipment types…</div>
      </SectionShell>
    );
  }
  if (catalog.error) {
    return (
      <SectionShell title="Shipment Types Catalog" subtitle="Controls shipment types shown on the public calculator and intake flows.">
        <div className="mt-4"><AlertBanner tone="error" message={catalog.error.message} /></div>
      </SectionShell>
    );
  }
  if (!catalog.data) return <></>;
  return <ShipmentTypesEditor key={catalog.data.updatedAt} canEdit={canEdit} initialItems={catalog.data.items} updatedAt={catalog.data.updatedAt} />;
}

function ShipmentTypesEditor({ canEdit, initialItems, updatedAt }: { canEdit: boolean; initialItems: ShipmentTypeCatalogItem[]; updatedAt: string }): ReactElement {
  const updateMutation = useUpdateShipmentTypesCatalog();
  const [rows, setRows] = useState<EditableRow[]>(() => initialItems.map((item) => ({ ...item })));
  const originalKeys = useMemo(() => initialItems.map((item) => item.key), [initialItems]);

  const updateRow = (index: number, patch: Partial<EditableRow>): void =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const handleSave = async (): Promise<void> => {
    const itemsToUpsert: ShipmentTypeCatalogItem[] = rows.filter((r) => !r._markedForDelete).map((row) => ({
      key: row.key.trim(), label: row.label.trim(), isActive: row.isActive,
      coreShipmentType: row.coreShipmentType, estimatorMode: row.estimatorMode,
      infoTitle: row.infoTitle ?? undefined, infoDescription: row.infoDescription ?? undefined,
      submitEndpoint: row.submitEndpoint ?? undefined, requiredFields: row.requiredFields,
      nextStep: row.nextStep ?? undefined,
    }));
    const livingKeys = new Set(itemsToUpsert.map((i) => i.key));
    const deleteKeys = originalKeys.filter((key) => !livingKeys.has(key));
    if (itemsToUpsert.some((i) => !i.key || !i.label)) return;
    try { await updateMutation.mutate({ items: itemsToUpsert, deleteKeys }); } catch { /* feedback in hook */ }
  };

  return (
    <SectionShell title="Shipment Types Catalog" subtitle="Controls shipment types shown on the public calculator and intake flows.">
      <div className="mb-1 mt-1 text-right text-[11px] text-gray-400">Updated {new Date(updatedAt).toLocaleString()}</div>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">No shipment types configured.</div>
        ) : (
          rows.map((row, idx) => (
            <ShipmentTypeRow key={`${row.key || 'new'}-${idx}`} row={row} canEdit={canEdit} onChange={(patch) => updateRow(idx, patch)} onToggleDelete={() => updateRow(idx, { _markedForDelete: !row._markedForDelete })} />
          ))
        )}
      </div>
      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setRows((p) => [...p, { key: '', label: '', isActive: true, coreShipmentType: 'air', estimatorMode: 'CALCULATED', requiredFields: [], _isNew: true }])} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Add shipment type</button>
          <button type="button" onClick={() => void handleSave()} disabled={updateMutation.isPending} className={cn('rounded-xl px-4 py-2 text-sm font-semibold text-white transition', updateMutation.isPending ? 'cursor-not-allowed bg-gray-400' : 'bg-brand-500 hover:bg-brand-600')}>
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </SectionShell>
  );
}

function ShipmentTypeRow({ row, canEdit, onChange, onToggleDelete }: { row: EditableRow; canEdit: boolean; onChange: (p: Partial<EditableRow>) => void; onToggleDelete: () => void }): ReactElement {
  const disabled = !canEdit || row._markedForDelete;
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-gray-50 p-4', row._markedForDelete && 'opacity-50')}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col text-xs"><span className="font-medium text-gray-700">Key</span><input type="text" disabled={disabled || (!row._isNew && canEdit)} value={row.key} onChange={(e) => onChange({ key: e.target.value })} className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 disabled:bg-gray-100" /></label>
        <label className="flex flex-col text-xs"><span className="font-medium text-gray-700">Label</span><input type="text" disabled={disabled} value={row.label} onChange={(e) => onChange({ label: e.target.value })} className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 disabled:bg-gray-100" /></label>
        <label className="flex flex-col text-xs"><span className="font-medium text-gray-700">Core shipment type</span><select disabled={disabled} value={row.coreShipmentType} onChange={(e) => onChange({ coreShipmentType: e.target.value as EditableRow['coreShipmentType'] })} className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 disabled:bg-gray-100"><option value="air">air</option><option value="ocean">ocean</option><option value="d2d">d2d</option></select></label>
        <label className="flex flex-col text-xs"><span className="font-medium text-gray-700">Estimator mode</span><select disabled={disabled} value={row.estimatorMode} onChange={(e) => onChange({ estimatorMode: e.target.value as EditableRow['estimatorMode'] })} className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 disabled:bg-gray-100"><option value="CALCULATED">CALCULATED</option><option value="INTAKE">INTAKE</option></select></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" disabled={disabled} checked={row.isActive} onChange={(e) => onChange({ isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />Active</label>
        {canEdit && (<button type="button" onClick={onToggleDelete} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition', row._markedForDelete ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-rose-50 text-rose-700 hover:bg-rose-100')}>{row._markedForDelete ? 'Undo delete' : 'Delete'}</button>)}
      </div>
    </div>
  );
}

/* ── Main SettingsPage ───────────────────────────────────────── */

export function SettingsPage(): ReactElement {
  const { t } = useTranslation('settings');
  const { data, isLoading, error } = useDashboardData();
  useSearch();
  const { user } = useAuth();
  const { isSignedIn: isClerkSignedIn, getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const {
    preferences, isLoading: prefsLoading, error: prefsError,
    isSaving: prefsSaving, saveError: prefsSaveError, updateChannel,
  } = useMyNotificationPreferences();

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCustomer = isClerkSignedIn && !user;
  const isOperator = useCan('app.operator');
  const isAdmin = useCan('app.admin');
  const isSuperadmin = useCan('app.superadmin');

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  /* ── Change password ──────────────────────────────────────── */
  const changePasswordMutation = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleChangePassword = async (): Promise<void> => {
    setPasswordSuccess(null);
    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      setPasswordSuccess(t('changePassword.successMessage'));
      setCurrentPassword('');
      setNewPassword('');
    } catch { /* error on mutation state */ }
  };

  /* ── Onboarding settings (superadmin) ─────────────────────── */
  const [onboardingReqs, setOnboardingReqs] = useState<ProfileRequirements | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingSaving, setOnboardingSaving] = useState(false);

  useEffect(() => {
    if (!isSuperadmin) return;
    const token = localStorage.getItem('globalxpress_token');
    if (!token) return;
    setOnboardingLoading(true);
    getOnboardingSettings(token)
      .then(setOnboardingReqs)
      .catch(() => setOnboardingError(t('onboarding.failedMessage')))
      .finally(() => setOnboardingLoading(false));
  }, [isSuperadmin, t]);

  const handleToggleNationalId = async (): Promise<void> => {
    const token = localStorage.getItem('globalxpress_token');
    if (!token || !onboardingReqs) return;
    setOnboardingSaving(true);
    try {
      const updated = await updateOnboardingSettings(token, { requireNationalId: !onboardingReqs.requireNationalId });
      setOnboardingReqs(updated);
    } catch { setOnboardingError(t('onboarding.failedMessage')); }
    finally { setOnboardingSaving(false); }
  };

  /* ── Notification channels ────────────────────────────────── */
  const channelRows: Array<{ key: keyof NonNullable<typeof preferences>['channels']; label: string }> = [
    { key: 'notifyEmailAlerts', label: t('notificationPreferences.channels.notifyEmailAlerts') },
    { key: 'notifyInAppAlerts', label: t('notificationPreferences.channels.notifyInAppAlerts') },
    { key: 'consentMarketing', label: t('notificationPreferences.channels.consentMarketing') },
  ];

  /* ── Customer actions ─────────────────────────────────────── */
  const handleExport = async (): Promise<void> => {
    setExportError(null);
    setIsExporting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token is missing.');
      const file = await exportMyAccountData(token);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : t('accountDataExport.failedMessage'));
    } finally { setIsExporting(false); }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token is missing.');
      await deleteMyAccount(token);
      localStorage.removeItem('globalxpress_token');
      localStorage.removeItem('globalxpress_refresh');
      await signOut();
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('deleteAccount.failedMessage'));
    } finally { setIsDeleting(false); setShowDeleteConfirm(false); }
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel={t('loadingLabel')}>
      <div className="space-y-6">
        <PageHeader title={t('pageTitle')} subtitle={t('subtitle')} />

        {/* Operator tab bar */}
        {isOperator && (
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1 scrollbar-none">
            {OPERATOR_TAB_IDS.map((tabId) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={cn(
                  'whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition',
                  activeTab === tabId ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {TAB_FALLBACK_LABEL[tabId]}
              </button>
            ))}
          </div>
        )}

        {/* ── General ─────────────────────────────────────── */}
        {activeTab === 'general' && (
          <>
            {isOperator && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">{t('changePassword.title')}</h3>
                <p className="mt-1 text-xs text-gray-500">{t('changePassword.subtitle')}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="current-pw" className="block text-xs font-medium text-gray-700">{t('changePassword.currentPassword')}</label>
                    <input id="current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500" />
                  </div>
                  <div>
                    <label htmlFor="new-pw" className="block text-xs font-medium text-gray-700">{t('changePassword.newPassword')}</label>
                    <input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500" />
                  </div>
                </div>
                {changePasswordMutation.error instanceof Error && <div className="mt-3"><AlertBanner tone="error" message={changePasswordMutation.error.message} /></div>}
                {passwordSuccess && <div className="mt-3"><AlertBanner tone="success" message={passwordSuccess} /></div>}
                <div className="mt-4">
                  <button type="button" disabled={changePasswordMutation.isPending || !currentPassword || !newPassword} onClick={() => void handleChangePassword()} className={cn('rounded-xl px-4 py-2 text-sm font-semibold text-white transition', changePasswordMutation.isPending || !currentPassword || !newPassword ? 'cursor-not-allowed bg-gray-400' : 'bg-brand-500 hover:bg-brand-600')}>
                    {changePasswordMutation.isPending ? t('changePassword.savingButton') : t('changePassword.saveButton')}
                  </button>
                </div>
              </section>
            )}

            {isOperator && <MfaSettingsCard />}

            {isOperator && isSuperadmin && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">{t('onboarding.title')}</h3>
                <p className="mt-1 text-xs text-gray-500">{t('onboarding.subtitle')}</p>
                {onboardingLoading && <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">{t('onboarding.loadingText')}</div>}
                {onboardingError && <div className="mt-4"><AlertBanner tone="error" message={onboardingError} /></div>}
                {!onboardingLoading && !onboardingError && onboardingReqs && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('onboarding.requireNationalId')}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{t('onboarding.requireNationalIdDescription')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', onboardingReqs.requireNationalId ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                          {onboardingReqs.requireNationalId ? t('onboarding.enabled') : t('onboarding.disabled')}
                        </span>
                        <Toggle checked={onboardingReqs.requireNationalId} onChange={() => void handleToggleNationalId()} disabled={onboardingSaving} label="Toggle national ID requirement" />
                      </div>
                    </div>
                    {onboardingSaving && <p className="mt-2 text-xs text-gray-500">{t('onboarding.savingText')}</p>}
                  </div>
                )}
              </section>
            )}

            {isCustomer && (
              <section className="space-y-6">
                {/* Data export */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{t('accountDataExport.title')}</h3>
                      <p className="mt-1 text-xs text-gray-500">{t('accountDataExport.subtitle')}</p>
                    </div>
                    <button type="button" onClick={() => void handleExport()} disabled={isExporting || isDeleting} className={cn('rounded-xl px-4 py-2 text-sm font-semibold text-white transition', isExporting ? 'cursor-not-allowed bg-gray-400' : 'bg-brand-500 hover:bg-brand-600')}>
                      {isExporting ? t('accountDataExport.exportingButton') : t('accountDataExport.exportButton')}
                    </button>
                  </div>
                  {exportError && <div className="mt-4"><AlertBanner tone="error" message={exportError} /></div>}
                </div>

                {/* Delete account */}
                <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-red-700">{t('deleteAccount.title')}</h3>
                      <p className="mt-1 text-xs text-gray-500">{t('deleteAccount.subtitle')}</p>
                    </div>
                    <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting || isExporting} className={cn('rounded-xl px-4 py-2 text-sm font-semibold text-white transition', isDeleting ? 'cursor-not-allowed bg-gray-400' : 'bg-red-600 hover:bg-red-700')}>
                      {t('deleteAccount.deleteButton')}
                    </button>
                  </div>
                  {deleteError && <div className="mt-4"><AlertBanner tone="error" message={deleteError} /></div>}
                  <ConfirmModal isOpen={showDeleteConfirm} title={t('deleteAccount.modal.title')} message={t('deleteAccount.modal.message')} confirmLabel={t('deleteAccount.modal.confirmLabel')} cancelLabel={t('deleteAccount.modal.cancelLabel')} tone="danger" isLoading={isDeleting} onConfirm={() => void handleDeleteAccount()} onCancel={() => setShowDeleteConfirm(false)} />
                </div>

                {/* Notification preferences */}
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900">{t('notificationPreferences.title')}</h3>
                  <p className="mt-1 text-xs text-gray-500">{t('notificationPreferences.subtitle')}</p>
                  <div className="mt-5">
                    {prefsLoading && <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">{t('notificationPreferences.loadingText')}</div>}
                    {!prefsLoading && prefsError && <AlertBanner tone="error" message={prefsError} />}
                    {!prefsLoading && !prefsError && prefsSaveError && <div className="mt-3"><AlertBanner tone="error" message={prefsSaveError} /></div>}
                    {!prefsLoading && !prefsError && preferences && (
                      <div className="space-y-3">
                        {channelRows.map((row) => {
                          const currentValue = preferences.channels[row.key];
                          const isEnabled = currentValue === true;
                          return (
                            <div key={row.key} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{row.label}</p>
                                <p className="mt-1 text-xs text-gray-500">{isEnabled ? t('notificationPreferences.status.enabled') : t('notificationPreferences.status.disabled')}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600')}>
                                  {isEnabled ? t('notificationPreferences.status.enabled') : t('notificationPreferences.status.disabled')}
                                </span>
                                <Toggle checked={isEnabled} onChange={() => void updateChannel(row.key, !isEnabled)} disabled={prefsSaving} label={`Toggle ${row.label}`} />
                              </div>
                            </div>
                          );
                        })}
                        {prefsSaving && <p className="text-xs text-gray-500">{t('notificationPreferences.savingText')}</p>}
                      </div>
                    )}
                  </div>
                </section>
              </section>
            )}
          </>
        )}

        {/* ── FX Rate ─────────────────────────────────────── */}
        {isOperator && activeTab === 'fx' && <FxRateSection canEdit={isSuperadmin} />}

        {/* ── Pricing ─────────────────────────────────────── */}
        {isOperator && activeTab === 'pricing' && <PricingSection canEdit={isSuperadmin} />}

        {/* ── Restricted Goods ────────────────────────────── */}
        {isOperator && activeTab === 'restricted-goods' && <RestrictedGoodsSection canEdit={isAdmin} />}

        {/* ── Shipment Types ───────────────────────────────── */}
        {isOperator && activeTab === 'shipment-types' && <ShipmentTypesSection canEdit={isSuperadmin} />}

        {/* ── Logistics ───────────────────────────────────── */}
        {isOperator && activeTab === 'logistics' && <LogisticsSection canEdit={isAdmin} canEditOffices={isSuperadmin} />}

        {/* ── Notification Templates ───────────────────────── */}
        {isOperator && activeTab === 'notification-templates' && <NotificationTemplatesSection canEdit={isAdmin} />}
      </div>
    </AppShell>
  );
}
