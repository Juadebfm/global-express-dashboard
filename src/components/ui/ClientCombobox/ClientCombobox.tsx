import type { ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Loader2, UserPlus } from 'lucide-react';
import { useClients, useDebounce } from '@/hooks';
import type { ApiClient } from '@/types';
import { cn } from '@/utils';

/**
 * Narrow shape exposed to callers of `onSelect`. Lets call sites avoid
 * importing the full `ApiClient` if they only need id / name / email
 * for downstream state.
 */
export interface ClientComboboxClient {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

export interface ClientComboboxProps {
  /** Currently selected client id (form-controlled). */
  selectedId: string;
  /**
   * Snapshot of the selected client so the input can render the name
   * even when the current search results don't contain it (e.g. user
   * picked "Julius", then typed a search that excludes him). Optional —
   * if absent the combobox falls back to whatever it finds in its own
   * latest results, then to a blank input.
   */
  selectedClient?: ClientComboboxClient | null;
  /** Fires with the picked client when the user selects a row. */
  onSelect: (client: ApiClient) => void;
  /** Placeholder shown in the search input when no client is selected. */
  placeholder?: string;
  /** Label rendered above the input. Optional — caller can render its own. */
  label?: string;
  /** Inline hint shown under the label. */
  hint?: string;
  /** Validation error text — red border + message under the input. */
  error?: string | null;
  /** Empty-state copy when the search returns no matches. */
  emptyMessage?: string;
  /** Loading state copy shown while the BE query is in flight. */
  loadingMessage?: string;
  /** Disables the input + closes the dropdown. */
  disabled?: boolean;
  /** When provided, a "+ Add new client" button appears at the bottom of the dropdown. */
  onCreateNew?: () => void;
}

const DEBOUNCE_MS = 300;
const PAGE_LIMIT = 20;

/**
 * Customer-picker combobox backed by server-side search.
 *
 * Wraps `useClients({ search: debouncedSearch, limit: 20 })` internally
 * so callers don't manage the fetch lifecycle. Each instance runs its
 * own 300ms debounce on the search input; React Query dedupes
 * cross-component queries with identical search terms (so N picker
 * instances on the same page with empty search → 1 request).
 *
 * UX notes:
 * - Click-outside dismisses the open dropdown.
 * - Closed state shows the selected client's name (from
 *   `selectedClient` snapshot, or from latest results, or empty).
 * - Open state shows the live search input — typing fires a
 *   debounced query.
 * - Spinner replaces the chevron mid-fetch — same slot, no layout shift.
 */
export function ClientCombobox({
  selectedId,
  selectedClient = null,
  onSelect,
  placeholder,
  label,
  hint,
  error,
  emptyMessage = 'No matches',
  loadingMessage = 'Loading…',
  disabled = false,
  onCreateNew,
}: ClientComboboxProps): ReactElement {
  const componentId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebounce(search, DEBOUNCE_MS);

  // Server-side filter via useClients. Empty/whitespace search returns
  // the unfiltered paginated list (BE contract); the hook normalises
  // the value so trivial variants share a single React Query entry.
  const { clients, isLoading } = useClients({
    search: debouncedSearch,
    limit: PAGE_LIMIT,
  });

  // Resolve the display name when the input is closed. Prefer the
  // caller-supplied snapshot (always accurate for an in-session
  // selection); fall back to whatever happens to be in the latest
  // fetch (handles the case where the snapshot wasn't threaded).
  const resolvedSelected =
    selectedClient ?? clients.find((c) => c.id === selectedId) ?? null;

  // Click-outside dismissal. Each combobox has its own wrapper ref so
  // multiple instances on the same page don't fight over one handler.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent): void => {
      if (wrapperRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const inputValue = (() => {
    if (open) return search;
    if (resolvedSelected) {
      const name = [resolvedSelected.firstName, resolvedSelected.lastName]
        .filter(Boolean)
        .join(' ');
      return name || (resolvedSelected.email ?? '');
    }
    return '';
  })();

  // Pick one of three dropdown states — loading > empty > results.
  // Loading wins so the user always sees "we heard you, request out".
  const dropdownState: 'loading' | 'empty' | 'results' = isLoading
    ? 'loading'
    : clients.length === 0
      ? 'empty'
      : 'results';

  return (
    <div ref={wrapperRef} data-client-picker className="relative">
      {label && (
        <label
          htmlFor={componentId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}

      <div className="relative mt-1">
        <input
          id={componentId}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            // Clear any stale search string so the dropdown shows the
            // freshly-fetched first page when the user re-opens.
            setSearch('');
            setOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'w-full rounded-xl border bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2',
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-gray-200 focus:border-brand-400 focus:ring-brand-100',
            disabled && 'cursor-not-allowed bg-gray-50 text-gray-400',
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${componentId}-error` : undefined}
        />
        {open && isLoading ? (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className={cn(
              'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition',
              open && 'rotate-180',
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {open && !disabled && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {dropdownState === 'loading' && (
            <p className="px-4 py-3 text-xs text-gray-400">{loadingMessage}</p>
          )}
          {dropdownState === 'empty' && (
            <p className="px-4 py-3 text-xs text-gray-400">{emptyMessage}</p>
          )}
          {dropdownState === 'results' &&
            clients.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={c.id === selectedId}
                onClick={() => {
                  onSelect(c);
                  setSearch('');
                  setOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
              >
                <span className="font-medium">
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}
                </span>
                {(c.firstName || c.lastName) && (
                  <span className="ml-2 text-xs text-gray-400">{c.email}</span>
                )}
              </button>
            ))}

          {onCreateNew && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreateNew();
              }}
              className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-left text-sm font-medium text-brand-600 transition hover:bg-brand-50"
            >
              <UserPlus className="h-4 w-4" />
              Add new client
            </button>
          )}
        </div>
      )}

      {error && (
        <p id={`${componentId}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
