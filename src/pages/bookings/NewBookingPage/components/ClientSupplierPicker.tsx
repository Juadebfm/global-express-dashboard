import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Loader2, Search, UserRound } from 'lucide-react';
import { useClientSuppliers } from '@/hooks';
import { getDisplayErrorMessage } from '@/lib/feedback';
import type { ApiSupplier } from '@/types';

interface ClientSupplierPickerProps {
  /** The client this order is for. Null until staff have picked one. */
  clientId: string | undefined;
  selectedSupplierId: string | undefined;
  onSelect: (supplier: ApiSupplier) => void;
  onClear: () => void;
}

/**
 * Staff picking from the suppliers a client already uses.
 *
 * Deliberately not the customer-facing supplier directory: that is
 * `requireRole(USER)` and answers 403 for every internal account. This reads
 * `/admin/clients/:id/suppliers`, which is staff-or-above and, more usefully,
 * scoped to the relationships this client already has — which is what a staff
 * member taking a booking by phone is almost always looking for.
 *
 * The endpoint is keyed by client, so there is nothing to search until a
 * client is chosen.
 */
export function ClientSupplierPicker({
  clientId,
  selectedSupplierId,
  onSelect,
  onClear,
}: ClientSupplierPickerProps): ReactElement {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useClientSuppliers(clientId, { limit: 100 });

  const suppliers = useMemo(() => data?.data ?? [], [data]);

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.displayName, supplier.businessName, supplier.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [suppliers, search]);

  const selected = suppliers.find((supplier) => supplier.id === selectedSupplierId);

  if (!clientId) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
        Choose the client above first — then their suppliers appear here.
      </p>
    );
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-brand-700">Selected supplier</p>
          <p className="truncate text-sm font-semibold text-gray-900">{selected.displayName}</p>
          {selected.email && (
            <p className="mt-0.5 truncate text-xs text-gray-600">{selected.email}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="client-supplier-search"
        className="mb-1.5 block text-sm font-medium text-gray-700"
      >
        Find their supplier
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          id="client-supplier-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 hover:border-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 px-1 py-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading their suppliers…
        </div>
      )}

      {!isLoading && error && (
        <p className="text-sm text-red-600">
          {getDisplayErrorMessage(error, 'Could not load this client’s suppliers.')}
        </p>
      )}

      {!isLoading && !error && suppliers.length === 0 && (
        <p className="text-sm text-gray-500">
          This client has no saved suppliers yet. Choose “Someone new” to enter one.
        </p>
      )}

      {!isLoading && !error && suppliers.length > 0 && matches.length === 0 && (
        <p className="text-sm text-gray-500">No supplier matches that search.</p>
      )}

      {matches.length > 0 && (
        <ul className="max-h-56 divide-y divide-gray-50 overflow-y-auto rounded-xl border border-gray-200">
          {matches.map((supplier) => (
            <li key={supplier.id}>
              <button
                type="button"
                onClick={() => onSelect(supplier)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  <UserRound className="h-4 w-4 text-gray-400" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-800">
                    {supplier.displayName}
                  </span>
                  {supplier.email && (
                    <span className="block truncate text-xs text-gray-500">{supplier.email}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
