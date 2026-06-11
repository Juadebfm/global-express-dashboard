import type {
  LogisticsSettings,
  FxRateSettings,
  PricingRulesResponse,
  NotificationTemplate,
  RestrictedGood,
  ShipmentTypesCatalogResult,
  ShipmentTypesUpdatePayload,
  ShipmentTypesUpdateResult,
  SpecialPackagingType,
  BankAccountSettings,
  UpdateBankAccountsPayload,
} from '@/types';
import {
  apiGet,
  apiGetData,
  apiPatch,
  apiPatchData,
  apiPutData,
} from '@/lib/apiClient';

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as AnyRecord;
}

function asRecordArray(value: unknown): AnyRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => !!asRecord(item)) as AnyRecord[];
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return undefined;
}

// ── Logistics ──────────────────────────────────────────────────
export function getLogisticsSettings(token: string): Promise<LogisticsSettings> {
  return apiGetData<LogisticsSettings>('/settings/logistics', token);
}

export function updateLogisticsSettings(
  token: string,
  payload: Partial<LogisticsSettings>
): Promise<LogisticsSettings> {
  return apiPatchData<LogisticsSettings>('/settings/logistics', payload, token);
}

// ── FX Rate ────────────────────────────────────────────────────
export function getFxRate(token: string): Promise<FxRateSettings> {
  return apiGetData<FxRateSettings>('/settings/fx-rate', token);
}

export function updateFxRate(
  token: string,
  payload: Partial<FxRateSettings>
): Promise<FxRateSettings> {
  return apiPatchData<FxRateSettings>('/settings/fx-rate', payload, token);
}

// ── Pricing Rules ──────────────────────────────────────────────
export function getPricingRules(
  token: string,
  params: { mode?: string; customerId?: string; includeInactive?: boolean } = {}
): Promise<PricingRulesResponse> {
  const searchParams = new URLSearchParams();
  if (params.mode) searchParams.set('mode', params.mode);
  if (params.customerId) searchParams.set('customerId', params.customerId);
  if (params.includeInactive) searchParams.set('includeInactive', 'true');
  const qs = searchParams.toString();
  return apiGetData<PricingRulesResponse>(`/settings/pricing${qs ? `?${qs}` : ''}`, token);
}

export async function updatePricingRules(
  token: string,
  payload: unknown
): Promise<void> {
  await apiPatch('/settings/pricing', payload, token);
}

// ── Shipment Types catalog ─────────────────────────────────────
export function getShipmentTypesCatalog(
  token: string
): Promise<ShipmentTypesCatalogResult> {
  return apiGetData<ShipmentTypesCatalogResult>('/settings/shipment-types', token);
}

export function updateShipmentTypesCatalog(
  token: string,
  payload: ShipmentTypesUpdatePayload
): Promise<ShipmentTypesUpdateResult> {
  return apiPatchData<ShipmentTypesUpdateResult>(
    '/settings/shipment-types',
    payload,
    token
  );
}

// ── Notification Templates ─────────────────────────────────────
export function getTemplates(
  token: string,
  params: { channel?: string; locale?: string } = {}
): Promise<NotificationTemplate[]> {
  const searchParams = new URLSearchParams();
  if (params.channel) searchParams.set('channel', params.channel);
  if (params.locale) searchParams.set('locale', params.locale);
  const qs = searchParams.toString();
  return apiGetData<NotificationTemplate[]>(
    `/settings/templates${qs ? `?${qs}` : ''}`,
    token
  );
}

export function updateTemplate(
  token: string,
  id: string,
  payload: Partial<NotificationTemplate>
): Promise<NotificationTemplate> {
  return apiPatchData<NotificationTemplate>(`/settings/templates/${id}`, payload, token);
}

// ── Restricted Goods ───────────────────────────────────────────
export function getRestrictedGoods(
  token: string,
  params: { includeInactive?: boolean } = {}
): Promise<RestrictedGood[]> {
  const searchParams = new URLSearchParams();
  if (params.includeInactive) searchParams.set('includeInactive', 'true');
  const qs = searchParams.toString();
  return apiGetData<RestrictedGood[]>(
    `/settings/restricted-goods${qs ? `?${qs}` : ''}`,
    token
  );
}

export async function updateRestrictedGoods(
  token: string,
  payload: unknown
): Promise<void> {
  await apiPatch('/settings/restricted-goods', payload, token);
}

export async function getSpecialPackagingTypes(
  token: string
): Promise<SpecialPackagingType[]> {
  const response = await apiGet<unknown>(
    '/internal/settings/special-packaging',
    token
  );
  const root = asRecord(response);
  const dataRecord = asRecord(root?.data);

  const rows = asRecordArray(response)
    .concat(asRecordArray(root?.data))
    .concat(asRecordArray(root?.items))
    .concat(asRecordArray(root?.types))
    .concat(asRecordArray(dataRecord?.items))
    .concat(asRecordArray(dataRecord?.types))
    .concat(asRecordArray(dataRecord?.data));

  const mapped = rows
    .map((row): SpecialPackagingType | null => {
      const type = asString(row.type ?? row.key ?? row.code);
      if (!type) return null;

      const label = asString(row.label ?? row.name) ?? type;
      const surcharge = asNumber(row.surchargeUsd ?? row.surcharge_usd ?? row.surcharge ?? row.price);

      return {
        id: asString(row.id ?? row._id) ?? undefined,
        type,
        label,
        description: asString(row.description) ?? undefined,
        surchargeUsd: surcharge ?? undefined,
        isActive: asBoolean(row.isActive ?? row.active),
      };
    })
    .filter((item): item is SpecialPackagingType => Boolean(item));

  return mapped;
}

export interface SpecialPackagingUpsertItem {
  key: string;
  name: string;
  surchargeUsd: number;
}

// ── Bank accounts ─────────────────────────────────────────────────────────────

export function getBankAccounts(): Promise<BankAccountSettings> {
  // Public — no auth required.
  return apiGetData<BankAccountSettings>('/settings/bank-accounts');
}

export function updateBankAccounts(
  token: string,
  payload: UpdateBankAccountsPayload,
): Promise<BankAccountSettings> {
  return apiPatchData<BankAccountSettings>('/settings/bank-accounts', payload, token);
}

export function updateSpecialPackagingTypes(
  token: string,
  items: SpecialPackagingUpsertItem[],
): Promise<{ types: SpecialPackagingUpsertItem[]; message?: string }> {
  // Spec: PUT /api/v1/internal/settings/special-packaging — full replace, 0-50 entries
  return apiPutData<{ types: SpecialPackagingUpsertItem[]; message?: string }>(
    '/internal/settings/special-packaging',
    { types: items },
    token,
  );
}

export interface ItemTypeOption {
  key: string;
  label: string;
}

export function getItemTypes(token: string): Promise<{ items: ItemTypeOption[] }> {
  return apiGetData<{ items: ItemTypeOption[] }>('/settings/item-types', token);
}
