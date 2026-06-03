import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';

// Mock the hooks before the combobox imports them. useClients gets a
// vi.fn() each test programs; useDebounce becomes identity so the
// debounced search value === raw input value (no fake timers needed).
vi.mock('@/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/hooks')>('@/hooks');
  return {
    ...actual,
    useClients: vi.fn(),
    useDebounce: <T,>(value: T) => value,
  };
});

import { ClientCombobox } from './ClientCombobox';
import { useClients } from '@/hooks';
import type { ApiClient } from '@/types';

const TOKEN_KEY = 'globalxpress_token';

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

function programUseClients(
  clients: ApiClient[],
  options: { isLoading?: boolean } = {},
): void {
  vi.mocked(useClients).mockReturnValue({
    clients,
    pagination: {
      total: clients.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
    isLoading: options.isLoading ?? false,
    error: null,
  });
}

const ALICE = makeClient({ id: 'a', firstName: 'Alice', lastName: 'Anders', email: 'alice@x.com' });
const BOB = makeClient({ id: 'b', firstName: 'Bob', lastName: 'Brown', email: 'bob@y.com' });

beforeEach(() => {
  localStorage.setItem(TOKEN_KEY, 'fake-token-combobox');
  programUseClients([ALICE, BOB]);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe('ClientCombobox — server-side search', () => {
  it('renders the label + hint with an empty input when nothing is selected', () => {
    const { getByText, getByRole } = render(
      <ClientCombobox
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

  it('mirrors the caller-supplied selectedClient name into the closed input', () => {
    const { getByRole } = render(
      <ClientCombobox
        selectedId="b"
        selectedClient={{ id: 'b', firstName: 'Bob', lastName: 'Brown', email: 'bob@y.com' }}
        onSelect={() => {}}
      />,
    );
    expect((getByRole('textbox') as HTMLInputElement).value).toBe('Bob Brown');
  });

  it('falls back to the latest fetch when no selectedClient snapshot is passed', () => {
    // The combobox finds the selected id in its own results and shows
    // the name. Covers the case where the caller only knows the id
    // (e.g. restoring form state from query string).
    const { getByRole } = render(
      <ClientCombobox selectedId="a" onSelect={() => {}} />,
    );
    expect((getByRole('textbox') as HTMLInputElement).value).toBe('Alice Anders');
  });

  it('opens on focus and renders every client returned by useClients', () => {
    const { getByRole, getAllByRole } = render(
      <ClientCombobox selectedId="" onSelect={() => {}} />,
    );
    fireEvent.focus(getByRole('textbox'));
    expect(getAllByRole('option')).toHaveLength(2);
  });

  it('passes the typed search down to useClients (via the debounce stub)', () => {
    const { getByRole } = render(
      <ClientCombobox selectedId="" onSelect={() => {}} />,
    );
    const input = getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'alice' } });
    // Mocked useDebounce returns the value verbatim, so the very next
    // render call sees `search: 'alice'`.
    const lastCall = vi.mocked(useClients).mock.calls.at(-1)?.[0];
    expect(lastCall?.search).toBe('alice');
    expect(lastCall?.limit).toBe(20);
  });

  it('shows the loading placeholder while the fetch is in flight', () => {
    programUseClients([], { isLoading: true });
    const { getByRole, getByText } = render(
      <ClientCombobox
        selectedId=""
        onSelect={() => {}}
        loadingMessage="Loading…"
      />,
    );
    fireEvent.focus(getByRole('textbox'));
    expect(getByText('Loading…')).toBeTruthy();
  });

  it('shows the empty-state when useClients returns zero rows', () => {
    programUseClients([]);
    const { getByRole, getByText } = render(
      <ClientCombobox
        selectedId=""
        onSelect={() => {}}
        emptyMessage="No matches found"
      />,
    );
    fireEvent.focus(getByRole('textbox'));
    expect(getByText('No matches found')).toBeTruthy();
  });

  it('fires onSelect with the chosen client and closes the dropdown', () => {
    const onSelect = vi.fn();
    const { getByRole, getByText, queryAllByRole } = render(
      <ClientCombobox selectedId="" onSelect={onSelect} />,
    );
    fireEvent.focus(getByRole('textbox'));
    fireEvent.click(getByText('Bob Brown'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b', firstName: 'Bob' }),
    );
    expect(queryAllByRole('option')).toHaveLength(0);
  });

  it('surfaces error text and applies aria-invalid', () => {
    const { getByText, getByRole } = render(
      <ClientCombobox
        selectedId=""
        onSelect={() => {}}
        error="Pick a customer first"
      />,
    );
    expect(getByText('Pick a customer first')).toBeTruthy();
    expect(getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
  });

  it('disables interaction when disabled is set', () => {
    const { getByRole } = render(
      <ClientCombobox selectedId="" onSelect={() => {}} disabled />,
    );
    const input = getByRole('textbox') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('closes the dropdown when the user clicks outside the wrapper', () => {
    const { getByRole, queryAllByRole } = render(
      <div>
        <ClientCombobox selectedId="" onSelect={() => {}} />
        <button type="button" data-testid="outside">elsewhere</button>
      </div>,
    );
    fireEvent.focus(getByRole('textbox'));
    expect(queryAllByRole('option').length).toBeGreaterThan(0);

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(queryAllByRole('option')).toHaveLength(0);
  });
});
