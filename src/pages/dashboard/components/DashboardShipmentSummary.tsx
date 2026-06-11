import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShipmentsDashboard } from '@/hooks';
import type { StatusCategory } from '@/types';
import { ShipmentsSummary } from '@/pages/shipments/components';
import i18n from '@/i18n/i18n';

export function DashboardShipmentSummary(): ReactElement | null {
  const { t } = useTranslation('shipments');
  const { data: shipmentsData } = useShipmentsDashboard({ page: 1 });

  const summaryData = useMemo(() => {
    if (!shipmentsData) return null;

    const effectiveShipments = shipmentsData.shipments ?? [];

    const totals = effectiveShipments.reduce(
      (acc, s) => {
        acc.totalWeight += s.weightKg;
        acc.totalItems += s.packageCount;
        acc.statusCounts[s.status] += 1;
        return acc;
      },
      {
        totalWeight: 0,
        totalItems: 0,
        statusCounts: {
          pending: 0,
          active: 0,
          completed: 0,
          exception: 0,
        } as Record<StatusCategory, number>,
      }
    );

    const totalShipments = shipmentsData.pagination.total;
    const pageShipmentCount = effectiveShipments.length;
    const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
    const averageFormat = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const averageWeight = pageShipmentCount === 0 ? 0 : totals.totalWeight / pageShipmentCount;
    const averageItems = pageShipmentCount === 0 ? 0 : totals.totalItems / pageShipmentCount;

    return {
      overview: {
        ...shipmentsData.summary.overview,
        title: t('summary.totalShipments'),
        total: totalShipments,
        breakdown: [
          { id: 'pending', label: t('statusLabels.pending'), value: totals.statusCounts.pending, status: 'pending' as const },
          { id: 'active', label: t('statusLabels.active'), value: totals.statusCounts.active, status: 'active' as const },
          { id: 'completed', label: t('statusLabels.completed'), value: totals.statusCounts.completed, status: 'completed' as const },
          { id: 'exception', label: t('statusLabels.exception'), value: totals.statusCounts.exception, status: 'exception' as const },
        ],
      },
      metrics: [
        {
          ...shipmentsData.summary.metrics[0],
          title: t('summary.totalWeight'),
          value: totals.totalWeight,
          helperText: t('summary.averageWeight', { value: averageFormat.format(averageWeight) }),
        },
        {
          ...shipmentsData.summary.metrics[2],
          title: t('summary.totalItems'),
          value: totals.totalItems,
          helperText: t('summary.averageItems', { value: averageFormat.format(averageItems) }),
        },
      ],
    };
  }, [shipmentsData, t]);

  if (!summaryData) return null;

  return <ShipmentsSummary overview={summaryData.overview} metrics={summaryData.metrics} />;
}
