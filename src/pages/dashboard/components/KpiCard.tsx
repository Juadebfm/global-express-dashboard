import type { ReactElement } from 'react';
import { Boxes, Wallet, Truck, ClipboardList } from 'lucide-react';
import type { KpiCard as KpiCardType } from '@/types';
import i18n from '@/i18n/i18n';

interface KpiCardProps {
  data: KpiCardType;
}

const cardIcons: Record<string, ReactElement> = {
  totalShipping: <Boxes className="h-10 w-10 text-brand-500" />,
  totalSpent: <Wallet className="h-10 w-10 text-brand-500" />,
  activeShipments: <Truck className="h-10 w-10 text-brand-500" />,
  pendingOrders: <ClipboardList className="h-10 w-10 text-brand-500" />,
  totalOrders: <Boxes className="h-10 w-10 text-brand-500" />,
  deliveredTotal: <Boxes className="h-10 w-10 text-brand-500" />,
};

export function KpiCard({ data }: KpiCardProps): ReactElement {
  const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
  const displayValue = data.display ?? new Intl.NumberFormat(locale).format(data.value);
  const icon = cardIcons[data.id] ?? <Boxes className="h-10 w-10 text-brand-500" />;

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm">
      <span className="mb-5">{icon}</span>
      <p className="text-xl font-semibold text-gray-500">{data.title}</p>
      <p className="mt-3 text-3xl font-medium leading-none text-brand-500">{displayValue}</p>
    </div>
  );
}
