import type { ReactElement } from 'react';
import type { KpiCard as KpiCardType } from '@/types';
import { KpiCard } from './KpiCard';

interface KpiGridProps {
  items: KpiCardType[];
  emptyLabel?: string;
}

export function KpiGrid({ items, emptyLabel }: KpiGridProps): ReactElement {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
        {emptyLabel ?? 'No matching metrics found.'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <KpiCard key={item.id} data={item} />
      ))}
    </div>
  );
}
