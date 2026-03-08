import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('merges truthy class names', () => {
    expect(cn('px-2', undefined, 'py-3')).toBe('px-2 py-3');
  });

  it('resolves conflicting Tailwind classes with the latest value', () => {
    expect(cn('px-2', 'px-4', 'text-sm', 'text-lg')).toBe('px-4 text-lg');
  });

  it('supports arrays and conditional objects', () => {
    expect(cn(['mb-2', null], { 'font-bold': true, hidden: false })).toBe('mb-2 font-bold');
  });
});

