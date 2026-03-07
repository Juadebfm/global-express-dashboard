import type {
  LogisticsSettings,
  FxRateSettings,
  PricingRule,
  NotificationTemplate,
  RestrictedGood,
  SpecialPackagingType,
} from '@/types';
import { apiGet, apiPatch } from '@/lib/apiClient';

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
  const response = await apiGet<{ success: boolean; data: SpecialPackagingType[] }>(
    '/internal/settings/special-packaging',
    token
  );
  return response.data;
}
