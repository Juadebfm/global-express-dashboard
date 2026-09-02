import type { ReactElement } from 'react';
import { Loader2 } from 'lucide-react';
import { useOrderEstimate } from '@/hooks';
import {
  getEstimateDimensionGuidance,
  toParcelPayload,
  type ParcelDraft,
} from './parcelDraft';

interface EstimatePreviewProps {
  shipmentType: 'air' | 'sea';
  parcels: ParcelDraft[];
}

export function EstimatePreview({ shipmentType, parcels }: EstimatePreviewProps): ReactElement | null {
  const guidance = getEstimateDimensionGuidance(parcels);
  const parcelPayload = toParcelPayload(parcels) ?? [];
  // Passing no parcels leaves the estimate query disabled until all entered
  // dimensions are complete. This prevents a partial parcel from reaching the
  // API and producing a misleading calculation error.
  const estimateParcels = guidance ? [] : parcelPayload;
  const { data, isPending, isError, isFetching } = useOrderEstimate(shipmentType, estimateParcels);

  if (guidance) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        {guidance}
      </div>
    );
  }

  if (parcelPayload.length === 0) return null;

  if (isPending && !data) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>Calculating estimate…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
        Could not calculate estimate. Please check your input.
      </div>
    );
  }

  const isCustomRate = data.pricingSource === 'CUSTOMER_OVERRIDE';

  return (
    <div className={`rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 space-y-2 transition-opacity${isFetching ? ' opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Estimated cost</span>
        <div className="flex items-center gap-2">
          {isCustomRate && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Your rate
            </span>
          )}
          <span className="text-base font-semibold text-gray-900">
            ${data.estimatedCostUsd.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Est. transit</span>
        <span>{data.estimatedTransitDays} days</span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{data.disclaimer}</p>
    </div>
  );
}
