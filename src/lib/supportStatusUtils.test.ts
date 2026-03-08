import { describe, expect, it } from 'vitest';

import { getSupportStatusDisplay } from './supportStatusUtils';

describe('getSupportStatusDisplay', () => {
  it('returns customer labels for customer context', () => {
    const display = getSupportStatusDisplay('open', false);
    expect(display).toMatchObject({
      label: 'Awaiting response',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      dotClass: 'bg-amber-500',
    });
  });

  it('returns staff labels for staff context', () => {
    const display = getSupportStatusDisplay('open', true);
    expect(display.label).toBe('New');
  });

  it('falls back to open status styles for unknown states', () => {
    const display = getSupportStatusDisplay('unknown', true);
    expect(display).toMatchObject({
      label: 'New',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      dotClass: 'bg-amber-500',
    });
  });
});

