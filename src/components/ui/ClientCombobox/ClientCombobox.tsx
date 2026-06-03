import type { ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

/**
 * Narrow shape the combobox needs to render + filter. Defined here
 * (rather than importing `ApiClient`) so callers with a trimmed-down
 * projection (e.g. the 4-field shape `useNewShipmentForm` passes to
 * `BasicsStep`) can pass it without a cast. Any object with these
 * fields satisfies the contract via TypeScript's structural typing.
 */
export interface ClientComboboxClient {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

export interface ClientComboboxProps<T extends ClientComboboxClient = ClientComboboxClient> {
  /** Pre-fetched client list — caller is responsible for the fetch. */
  clients: T[];
  /** Currently selected client id (form-controlled). */
  selectedId: string;
  /**
   * Fires with the selected client; caller persists the id + any side
   * state. Generic over T so callers passing `ApiClient[]` get
   * `ApiClient` back, callers passing a narrow projection get the
   * projection back — no casts needed at the call site.
   */
  onSelect: (client: T) => void;
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
  /** Max number of dropdown rows to render (avoids rendering 50 buttons). */
  maxResults?: number;
  /** Disables the input + closes the dropdown. */
  disabled?: boolean;
}

/**
 * Customer-picker combobox. Wraps a pre-fetched `ApiClient[]` (typically
 * from `useClients`) with a text input that filters by `firstName`,
 * `lastName`, or `email`, and a dropdown that surfaces matches.
 *
 * UX notes:
 * - Click-outside dismisses the open dropdown (uses `data-client-picker`
 *   on the wrapper + a document-level mousedown listener).
 * - Selected client renders as `"First Last (email)"` in the input so the
 *   user can see who they picked at a glance.
 * - When the search returns more than `maxResults`, the dropdown caps
 *   silently — users typing a more specific query reach the long tail.
 *
 * Known limitation (documented in IMPLEMENTATION_PLAN.md): the search is
 * FE-side over the fetched set. Above the caller's fetch limit (50 today)
 * the long tail is invisible. Future BE work: expose
 * `/admin/clients?search=` and swap the filter for server-side search.
 */
export function ClientCombobox<T extends ClientComboboxClient = ClientComboboxClient>({
  clients,
  selectedId,
  onSelect,
  placeholder,
  label,
  hint,
  error,
  emptyMessage = 'No matches',
  maxResults = 15,
  disabled = false,
}: ClientComboboxProps<T>): ReactElement {
  const componentId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Two pieces of state: what the user is typing (filters the dropdown)
  // and whether the dropdown is open. Selection persists outside the
  // component — we mirror it into the input only when the dropdown is
  // closed so it reads as "current selection" rather than "search".
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selectedClient = clients.find((c) => c.id === selectedId);

  // Close on outside click. Wrapper carries `data-client-picker` so
  // multiple instances on the same page each maintain their own open
  // state without fighting over one global handler.
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
    if (selectedClient) {
      const name = [selectedClient.firstName, selectedClient.lastName]
        .filter(Boolean)
        .join(' ');
      return name || selectedClient.email;
    }
    return '';
  })();

  const filtered = search.trim()
    ? clients.filter((c) => {
        const hay = `${c.firstName ?? ''} ${c.lastName ?? ''} ${c.email}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      })
    : clients;

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
            // Clear any stale search so the dropdown shows the full
            // fetched set when the user re-opens.
            setSearch('');
            setOpen(true);
          }}
          placeholder={placeholder}
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
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition',
            open && 'rotate-180',
          )}
        />
      </div>

      {open && !disabled && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">{emptyMessage}</p>
          ) : (
            filtered.slice(0, maxResults).map((c) => (
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
            ))
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
