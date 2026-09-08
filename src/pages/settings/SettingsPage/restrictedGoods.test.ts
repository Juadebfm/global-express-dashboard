import { describe, expect, it } from 'vitest';
import type { RestrictedGood } from '@/types';
import {
  buildRestrictedGoodsUpdatePayload,
  normalizeRestrictedGoodForEdit,
} from './restrictedGoods';

describe('Restricted Goods form data', () => {
  it('converts legacy null text values into saveable strings', () => {
    const legacyGood = {
      id: 'good-1',
      code: 'laptops',
      nameEn: 'Laptops',
      nameKo: null,
      description: 'Laptops require manual review',
      allowWithOverride: true,
      isActive: true,
    } as unknown as RestrictedGood;

    const payload = buildRestrictedGoodsUpdatePayload([
      normalizeRestrictedGoodForEdit(legacyGood),
    ]);

    expect(payload.items).toEqual([
      expect.objectContaining({ nameKo: '' }),
    ]);
  });

  it('preserves an entered Korean name in the save payload', () => {
    const payload = buildRestrictedGoodsUpdatePayload([
      normalizeRestrictedGoodForEdit({
        id: 'good-1',
        code: 'laptops',
        nameEn: 'Laptops',
        nameKo: '노트북',
        description: 'Laptops require manual review',
        allowWithOverride: true,
        isActive: true,
      }),
    ]);

    expect(payload.items[0]?.nameKo).toBe('노트북');
  });
});
