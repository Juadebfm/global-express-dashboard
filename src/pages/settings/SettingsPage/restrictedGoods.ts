import type { RestrictedGood } from '@/types';

export interface RestrictedGoodDraft extends Partial<RestrictedGood> {
  _isNew?: boolean;
  _markedForDelete?: boolean;
}

export interface RestrictedGoodsUpdateItem {
  id?: string;
  code: string;
  nameEn: string;
  nameKo: string;
  description: string;
  allowWithOverride: boolean;
  isActive: boolean;
}

export interface RestrictedGoodsUpdatePayload {
  items: RestrictedGoodsUpdateItem[];
  deleteIds: string[];
}

/**
 * Historic catalog rows may have null text values. Normalize them as form
 * state is created so saving unchanged rows never sends null for a text field.
 */
export function normalizeRestrictedGoodForEdit(
  good: Partial<RestrictedGood>,
): RestrictedGoodDraft {
  return {
    ...good,
    code: good.code ?? '',
    nameEn: good.nameEn ?? '',
    nameKo: good.nameKo ?? '',
    description: good.description ?? '',
    allowWithOverride: good.allowWithOverride ?? false,
    isActive: good.isActive ?? true,
  };
}

export function buildRestrictedGoodsUpdatePayload(
  rows: RestrictedGoodDraft[],
): RestrictedGoodsUpdatePayload {
  return {
    deleteIds: rows
      .filter((row) => row._markedForDelete && row.id)
      .map((row) => row.id as string),
    items: rows
      .filter((row) => !row._markedForDelete)
      .map((row) => ({
        id: row.id,
        code: row.code ?? '',
        nameEn: row.nameEn ?? '',
        nameKo: row.nameKo ?? '',
        description: row.description ?? '',
        allowWithOverride: row.allowWithOverride ?? false,
        isActive: row.isActive ?? true,
      })),
  };
}
