import type { ReactElement } from 'react';

export interface PlaceholderItem {
  id: string;
  title: string;
  subtitle?: string;
  tag?: string;
}

interface PagePlaceholderProps {
  title: string;
  description: string;
  items: PlaceholderItem[];
  query: string;
  emptyLabel?: string;
}

export function PagePlaceholder({
  title,
  description,
  items,
  query,
  emptyLabel,
}: PagePlaceholderProps): ReactElement {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems =
    normalizedQuery.length === 0
      ? items
      : items.filter((item) => {
          const haystack = [item.title, item.subtitle, item.tag]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        });

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>

      <div className="mt-5 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
            {emptyLabel ?? 'No matching items found.'}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{item.subtitle}</p>
                )}
              </div>
              {item.tag && (
                <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-600">
                  {item.tag}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
