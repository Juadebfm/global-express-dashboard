import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PhoneLink } from './PhoneLink';

describe('PhoneLink', () => {
  it('opens the device dialler with a normalized phone number', () => {
    render(<PhoneLink phone="+234 706-311-0135" />);

    const link = screen.getByRole('link', { name: 'Call +234 706-311-0135' });
    expect(link.getAttribute('href')).toBe('tel:+2347063110135');
  });
});
