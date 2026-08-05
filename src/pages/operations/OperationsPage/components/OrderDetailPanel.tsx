import type { ReactElement } from 'react';
import { CustomerParcelsPanel } from '@/components/orders';
import { Loader2 } from 'lucide-react';
import {
  useCapability,
  useDeleteOrderImage,
  useOrderDetail,
  useOrderImages,
  useOrderPayments,
  useOrderTimeline,
  useUpload,
} from '@/hooks';
import { cn } from '@/utils';
import type { DetailTab } from '@/pages/shared';
import { canReVerifyPackages, isWarehouseVerifiable, toView } from '@/pages/shared';
import { OrderSummaryCard } from './OrderSummaryCard';
import { OverviewPanel } from './OverviewPanel';
import { HoldQueueStep } from './HoldQueueStep';
import { VerifyQueueStep } from './VerifyQueueStep';
import { PaymentQueueStep } from './PaymentQueueStep';
import { OrderPaymentHistory } from './OrderPaymentHistory';
import { ImageGallery } from './ImageGallery';
import { OrderTimeline } from './OrderTimeline';
import { RecordsTab } from './RecordsTab';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'warehouse', label: 'Warehouse' },
  { id: 'records', label: 'Records' },
  { id: 'payment', label: 'Payment' },
  { id: 'images', label: 'Images' },
  { id: 'timeline', label: 'Timeline' },
];

export interface OrderDetailPanelProps {
  orderId: string;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onExit: () => void;
}

/**
 * "Inspect" mode for the order workspace pane — reached by clicking a row in
 * the browse pane or via an external `?select=<id>` deep link (no page
 * navigation, no forced guided-queue chrome). Some tabs reuse the same
 * queue-step components the guided flow uses (they're already prop-driven,
 * not queue-aware), just rendered as a single-order, single-tab view instead
 * of a multi-order sequence.
 */
export function OrderDetailPanel({ orderId, activeTab, onTabChange, onExit }: OrderDetailPanelProps): ReactElement {
  const orderDetailQuery = useOrderDetail(orderId);
  const view = orderDetailQuery.data ? toView(orderDetailQuery.data) : null;

  if (orderDetailQuery.isLoading || !view) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-300" />
        <p className="mt-2 text-sm text-gray-400">Loading order…</p>
      </div>
    );
  }

  if (orderDetailQuery.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {orderDetailQuery.error instanceof Error ? orderDetailQuery.error.message : 'Failed to load order'}
      </div>
    );
  }

  const backToOverview = (): void => onTabChange('overview');
  const singleStepProps = {
    view,
    currentIndex: 0,
    totalCount: 1,
    onNext: backToOverview,
    onExit: backToOverview,
  };

  return (
    <div className="space-y-4">
      {/* What the customer told us was coming. Read-only for staff — editing it
          would erase the record of what they actually said. */}
      {(orderDetailQuery.data?.customerDeclaredParcels?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <CustomerParcelsPanel
            orderId={orderDetailQuery.data!.id}
            parcels={orderDetailQuery.data!.customerDeclaredParcels ?? []}
            canEdit={false}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <OrderSummaryCard view={view} />
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
        >
          ← Back to list
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.id ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        view.statusV2 === 'ON_HOLD'
          ? <HoldQueueStep {...singleStepProps} />
          : <OverviewPanel view={view} />
      )}

      {activeTab === 'warehouse' && (
        isWarehouseVerifiable(view.statusV2) || canReVerifyPackages(view.statusV2)
          ? <VerifyQueueStep {...singleStepProps} />
          : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              Warehouse verification isn't available for this order's current status.
            </div>
          )
      )}

      {activeTab === 'records' && <RecordsTab orderId={view.id} invoice={view.invoice} />}

      {activeTab === 'payment' && <PaymentTab view={view} singleStepProps={singleStepProps} />}

      {activeTab === 'images' && <ImagesTab orderId={view.id} />}

      {activeTab === 'timeline' && <TimelineTab orderId={view.id} />}
    </div>
  );
}

function PaymentTab({
  view,
  singleStepProps,
}: {
  view: ReturnType<typeof toView>;
  singleStepProps: { view: ReturnType<typeof toView>; currentIndex: number; totalCount: number; onNext: () => void; onExit: () => void };
}): ReactElement {
  const isCollectible = view.statusV2 === 'WAREHOUSE_VERIFIED_PRICED' && view.paymentCollectionStatus?.toUpperCase() !== 'PAID_IN_FULL';
  const paymentsQuery = useOrderPayments(view.id, !isCollectible);
  if (isCollectible) {
    return <PaymentQueueStep {...singleStepProps} />;
  }
  return <OrderPaymentHistory payments={paymentsQuery.data ?? []} isLoading={paymentsQuery.isLoading} />;
}

function ImagesTab({ orderId }: { orderId: string }): ReactElement {
  // DELETE /uploads/images/:imageId is guarded by requireCapability(
  // 'operations.escalation.resolve') — the same grant that covers clearing an
  // escalation, not a role tier.
  const canDelete = useCapability('operations.escalation.resolve');
  const imagesQuery = useOrderImages(orderId);
  const uploadImage = useUpload();
  const deleteImage = useDeleteOrderImage();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <ImageGallery
        orderId={orderId}
        images={imagesQuery.data ?? []}
        isLoading={imagesQuery.isLoading}
        error={imagesQuery.error instanceof Error ? imagesQuery.error.message : null}
        canDelete={canDelete}
        isUploading={uploadImage.isPending}
        onUpload={async (id, files) => {
          for (const file of files) await uploadImage.mutateAsync({ orderId: id, file });
        }}
        onDelete={async (imageId) => {
          await deleteImage.mutateAsync({ imageId, orderId });
        }}
      />
    </div>
  );
}

function TimelineTab({ orderId }: { orderId: string }): ReactElement {
  const timelineQuery = useOrderTimeline(orderId, true);
  return (
    <OrderTimeline
      events={timelineQuery.data?.timeline ?? []}
      isLoading={timelineQuery.isLoading}
      error={timelineQuery.error instanceof Error ? timelineQuery.error : null}
    />
  );
}
