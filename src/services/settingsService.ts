import type {
  LogisticsSettings,
  FxRateSettings,
  PricingRule,
  NotificationTemplate,
  RestrictedGood,
  SpecialPackagingType,
} from '@/types';
import { apiGet, apiPatch } from '@/lib/apiClient';

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
export async function getLogisticsSettings(token: string): Promise<LogisticsSettings> {
  const response = await apiGet<{ success: boolean; data: LogisticsSettings }>(
    '/settings/logistics',
    token
  );
  return response.data;
}

export async function updateLogisticsSettings(
  token: string,
  payload: Partial<LogisticsSettings>
): Promise<LogisticsSettings> {
  const response = await apiPatch<{ success: boolean; data: LogisticsSettings }>(
    '/settings/logistics',
    payload,
    token
  );
  return response.data;
}

// ── FX Rate ────────────────────────────────────────────────────
export async function getFxRate(token: string): Promise<FxRateSettings> {
  const response = await apiGet<{ success: boolean; data: FxRateSettings }>(
    '/settings/fx-rate',
    token
  );
  return response.data;
}

export async function updateFxRate(
  token: string,
  payload: Partial<FxRateSettings>
): Promise<FxRateSettings> {
  const response = await apiPatch<{ success: boolean; data: FxRateSettings }>(
    '/settings/fx-rate',
    payload,
    token
  );
  return response.data;
}

// ── Pricing Rules ──────────────────────────────────────────────
export async function getPricingRules(
  token: string,
  params: { mode?: string; customerId?: string; includeInactive?: boolean } = {}
): Promise<PricingRule[]> {
  const searchParams = new URLSearchParams();
  if (params.mode) searchParams.set('mode', params.mode);
  if (params.customerId) searchParams.set('customerId', params.customerId);
  if (params.includeInactive) searchParams.set('includeInactive', 'true');
  const qs = searchParams.toString();
  const response = await apiGet<{ success: boolean; data: PricingRule[] }>(
    `/settings/pricing${qs ? `?${qs}` : ''}`,
    token
  );
  return response.data;
}

export async function updatePricingRules(
  token: string,
  payload: unknown
): Promise<void> {
  await apiPatch('/settings/pricing', payload, token);
}

// ── Notification Templates ─────────────────────────────────────
export async function getTemplates(
  token: string,
  params: { channel?: string; locale?: string } = {}
): Promise<NotificationTemplate[]> {
  const searchParams = new URLSearchParams();
  if (params.channel) searchParams.set('channel', params.channel);
  if (params.locale) searchParams.set('locale', params.locale);
  const qs = searchParams.toString();
  const response = await apiGet<{ success: boolean; data: NotificationTemplate[] }>(
    `/settings/templates${qs ? `?${qs}` : ''}`,
    token
  );
  return response.data;
}

export async function updateTemplate(
  token: string,
  id: string,
  payload: Partial<NotificationTemplate>
): Promise<NotificationTemplate> {
  const response = await apiPatch<{ success: boolean; data: NotificationTemplate }>(
    `/settings/templates/${id}`,
    payload,
    token
  );
  return response.data;
}

// ── Restricted Goods ───────────────────────────────────────────
export async function getRestrictedGoods(
  token: string,
  params: { includeInactive?: boolean } = {}
): Promise<RestrictedGood[]> {
  const searchParams = new URLSearchParams();
  if (params.includeInactive) searchParams.set('includeInactive', 'true');
  const qs = searchParams.toString();
  const response = await apiGet<{ success: boolean; data: RestrictedGood[] }>(
    `/settings/restricted-goods${qs ? `?${qs}` : ''}`,
    token
  );
  return response.data;
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
