import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ClientCombobox } from './ClientCombobox';
import type { ApiClient } from '@/types';

afterEach(() => cleanup());

function makeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    id: 'c-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    businessName: null,
    displayName: 'Jane Doe',
    phone: null,
    shippingMark: null,
    addressCity: null,
    addressCountry: null,
    isActive: true,
    orderCount: 0,
    totalPayments: '0',
    lastOrderDate: null,
    createdAt: '2026-01-01',
    ...overrides,
  } as ApiClient;
}

const CLIENTS: ApiClient[] = [
  makeClient({ id: 'a', firstName: 'Alice', lastName: 'Anders', email: 'alice@x.com' }),
  makeClient({ id: 'b', firstName: 'Bob', lastName: 'Brown', email: 'bob@y.com' }),
  makeClient({ id: 'c', firstName: 'Charlie', lastName: 'Chen', email: 'charlie@z.com' }),
];

describe('ClientCombobox', () => {
  it('renders the label + hint and shows nothing in the input when no selection', () => {
    const { getByText, getByRole } = render(
      <ClientCombobox
        clients={CLIENTS}
        selectedId=""
        onSelect={() => {}}
        label="Sender"
        hint="Who is sending this shipment?"
        placeholder="Search customers…"
      />,
    );
    expect(getByText('Sender')).toBeTruthy();
    expect(getByText('Who is sending this shipment?')).toBeTruthy();
    expect((getByRole('textbox') as HTMLInputElement).value).toBe('');
  });

  it('mirrors the selected client into the input when the dropdown is closed', () => {
    const { getByRole } = render(
      <ClientCombobox
        clients={CLIENTS}
        selectedId="b"
        onSelect={() => {}}
        label="Sender"
      />,
    );
    expect((getByRole('textbox') as HTMLInputElement).value).toBe('Bob Brown');
  });

  it('opens the dropdown on focus and lists every client', () => {
    const { getByRole, getAllByRole } = render(
      <ClientCombobox clients={CLIENTS} selectedId="" onSelect={() => {}} />,
    );
    fireEvent.focus(getByRole('textbox'));
    const options = getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('filters by name as the user types', () => {
    const { getByRole, queryByText } = render(
      <ClientCombobox clients={CLIENTS} selectedId="" onSelect={() => {}} />,
    );
    const input = getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'alice' } });
    expect(queryByText('Alice Anders')).toBeTruthy();
    expect(queryByText('Bob Brown')).toBeFalsy();
    expect(queryByText('Charlie Chen')).toBeFalsy();
  });

  it('filters by email when the search matches an address', () => {
    const { getByRole, queryByText } = render(
      <ClientCombobox clients={CLIENTS} selectedId="" onSelect={() => {}} />,
    );
    const input = getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'bob@y' } });
    expect(queryByText('Bob Brown')).toBeTruthy();
    expect(queryByText('Alice Anders')).toBeFalsy();
  });

  it('shows the empty-message when no client matches the search', () => {
    const { getByRole, getByText } = render(
      <ClientCombobox
        clients={CLIENTS}
        selectedId=""
        onSelect={() => {}}
        emptyMessage="No matches found"
      />,
    );
    const input = getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzzzzzz' } });
    expect(getByText('No matches found')).toBeTruthy();
  });

  it('fires onSelect with the chosen client', () => {
    const onSelect = vi.fn();
    const { getByRole, getByText } = render(
      <ClientCombobox clients={CLIENTS} selectedId="" onSelect={onSelect} />,
    );
    fireEvent.focus(getByRole('textbox'));
    fireEvent.click(getByText('Charlie Chen'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c', firstName: 'Charlie' }),
    );
  });

  it('caps the dropdown at maxResults rows so a huge set doesnt render 1000 buttons', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      makeClient({ id: `c${i}`, firstName: `First${i}`, lastName: `Last${i}`, email: `u${i}@x.com` }),
    );
    const { getByRole, getAllByRole } = render(
      <ClientCombobox
        clients={many}
        selectedId=""
        onSelect={() => {}}
        maxResults={5}
      />,
    );
    fireEvent.focus(getByRole('textbox'));
    expect(getAllByRole('option')).toHaveLength(5);
  });

  it('surfaces error text and applies the red border styles', () => {
    const { getByText, getByRole } = render(
      <ClientCombobox
        clients={CLIENTS}
        selectedId=""
        onSelect={() => {}}
        error="Pick a customer first"
      />,
    );
    expect(getByText('Pick a customer first')).toBeTruthy();
    const input = getByRole('textbox');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('disables interaction when disabled is set', () => {
    const onSelect = vi.fn();
    const { getByRole } = render(
      <ClientCombobox
        clients={CLIENTS}
        selectedId=""
        onSelect={onSelect}
        disabled
      />,
    );
    const input = getByRole('textbox') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
