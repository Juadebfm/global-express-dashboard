import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ClientSupplierPicker } from './ClientSupplierPicker';
import type { ApiSupplier } from '@/types';

const useClientSuppliers = vi.fn();

vi.mock('@/hooks', () => ({
  useClientSuppliers: (...args: unknown[]) => useClientSuppliers(...args),
}));

function supplier(id: string, displayName: string, email = ''): ApiSupplier {
  return { id, displayName, email } as ApiSupplier;
}

const CLIENT_ID = '7f1c0f6e-0000-4000-8000-000000000001';

beforeEach(() => {
  useClientSuppliers.mockReset();
  useClientSuppliers.mockReturnValue({ data: undefined, isLoading: false, error: null });
});

afterEach(() => {
  cleanup();
});

describe('ClientSupplierPicker', () => {
  // The endpoint is keyed by client, so there is nothing to search until one
  // is chosen — and firing it with no id would be a wasted request.
  it('asks for a client first and does not query without one', () => {
    render(
      <ClientSupplierPicker
        clientId={undefined}
        selectedSupplierId={undefined}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText(/Choose the client above first/i)).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('lists the suppliers this client already uses', () => {
    useClientSuppliers.mockReturnValue({
      data: { data: [supplier('s1', 'Guangzhou Textiles'), supplier('s2', 'Shenzhen Electronics')] },
      isLoading: false,
      error: null,
    });

    render(
      <ClientSupplierPicker
        clientId={CLIENT_ID}
        selectedSupplierId={undefined}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText('Guangzhou Textiles')).toBeInTheDocument();
    expect(screen.getByText('Shenzhen Electronics')).toBeInTheDocument();
  });

  it('filters on name and email as the staff member types', () => {
    useClientSuppliers.mockReturnValue({
      data: {
        data: [
          supplier('s1', 'Guangzhou Textiles', 'sales@gz.example'),
          supplier('s2', 'Shenzhen Parts', 'hi@sz.example'),
        ],
      },
      isLoading: false,
      error: null,
    });

    render(
      <ClientSupplierPicker
        clientId={CLIENT_ID}
        selectedSupplierId={undefined}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sz.example' } });

    expect(screen.getByText('Shenzhen Parts')).toBeInTheDocument();
    expect(screen.queryByText('Guangzhou Textiles')).not.toBeInTheDocument();
  });

  it('reports the picked supplier', () => {
    const onSelect = vi.fn();
    useClientSuppliers.mockReturnValue({
      data: { data: [supplier('s1', 'Guangzhou Textiles')] },
      isLoading: false,
      error: null,
    });

    render(
      <ClientSupplierPicker
        clientId={CLIENT_ID}
        selectedSupplierId={undefined}
        onSelect={onSelect}
        onClear={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Guangzhou Textiles/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  // A client with no saved suppliers is normal, not an error — staff take the
  // free-text path instead.
  it('points at the free-text path when the client has no suppliers', () => {
    useClientSuppliers.mockReturnValue({ data: { data: [] }, isLoading: false, error: null });

    render(
      <ClientSupplierPicker
        clientId={CLIENT_ID}
        selectedSupplierId={undefined}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText(/no saved suppliers yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Someone new/)).toBeInTheDocument();
  });

  it('shows the selection with a way to change it', () => {
    const onClear = vi.fn();
    useClientSuppliers.mockReturnValue({
      data: { data: [supplier('s1', 'Guangzhou Textiles', 'sales@gz.example')] },
      isLoading: false,
      error: null,
    });

    render(
      <ClientSupplierPicker
        clientId={CLIENT_ID}
        selectedSupplierId="s1"
        onSelect={vi.fn()}
        onClear={onClear}
      />,
    );

    expect(screen.getByText('Selected supplier')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(onClear).toHaveBeenCalled();
  });
});
