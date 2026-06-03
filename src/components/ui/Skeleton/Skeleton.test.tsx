import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Skeleton } from './Skeleton';

// The shared vitest setup (src/test/setup.ts) doesn't register the auto-
// cleanup that @testing-library/react usually wires in. Without this the
// DOM accumulates renders across tests in this file and getByRole sees
// multiple matches.
afterEach(() => cleanup());

describe('Skeleton', () => {
  it('renders an accessible loading region', () => {
    const { getByRole } = render(<Skeleton />);
    const node = getByRole('status');
    expect(node.getAttribute('aria-busy')).toBe('true');
    expect(node.getAttribute('aria-label')).toBe('Loading');
  });

  it('accepts a custom aria label so screen readers describe the surface', () => {
    const { getByLabelText } = render(<Skeleton ariaLabel="Loading shipments" />);
    expect(getByLabelText('Loading shipments')).toBeTruthy();
  });

  it('converts numeric width/height to px strings', () => {
    const { getByRole } = render(<Skeleton width={120} height={16} />);
    const node = getByRole('status') as HTMLDivElement;
    expect(node.style.width).toBe('120px');
    expect(node.style.height).toBe('16px');
  });

  it('passes string width/height through verbatim', () => {
    const { getByRole } = render(<Skeleton width="60%" height="2rem" />);
    const node = getByRole('status') as HTMLDivElement;
    expect(node.style.width).toBe('60%');
    expect(node.style.height).toBe('2rem');
  });

  it('renders a circle when requested', () => {
    const { getByRole } = render(<Skeleton circle />);
    const node = getByRole('status');
    expect(node.className).toContain('rounded-full');
  });

  it('merges extra className on top of the base styles', () => {
    const { getByRole } = render(<Skeleton className="ml-2" />);
    const node = getByRole('status');
    expect(node.className).toContain('animate-pulse');
    expect(node.className).toContain('ml-2');
  });
});
