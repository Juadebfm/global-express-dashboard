import type { ReactElement } from 'react';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Image } from 'lucide-react';
import { useWarehouseVerify, useOrderImages, useOrderTimeline, useUpload, useCan } from '@/hooks';
import { cn } from '@/utils';
import type { OrderView } from '../types';
import { canReVerifyPackages } from '../types';
import { QueueShell } from './QueueShell';
import { OrderSummaryCard } from './OrderSummaryCard';
import { WarehouseVerifyForm } from './WarehouseVerifyForm';
import { ImageGallery } from './ImageGallery';

const FORM_ID = 'verify-queue-form';

interface VerifyQueueStepProps {
  view: OrderView;
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onSkip?: () => void;
  onExit: () => void;
}

export function VerifyQueueStep({
  view,
  currentIndex,
  totalCount,
  onNext,
  onSkip,
  onExit,
}: VerifyQueueStepProps): ReactElement {
  const canApproveOverride = useCan('orders.approveOverride');
  const [showImages, setShowImages] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resultStatus, setResultStatus] = useState<'verified' | 'on_hold' | null>(null);

  const verifyWarehouse = useWarehouseVerify();
  const uploadImage = useUpload();
  const imagesQuery = useOrderImages(view.id);
  const timelineQuery = useOrderTimeline(view.id, true);

  const images = Array.isArray(imagesQuery.data) ? imagesQuery.data : [];
  const goodsBreakdown = timelineQuery.data?.goodsBreakdown ?? [];

  const isD2D = view.shipmentType === 'd2d';
  const isReVerify = canReVerifyPackages(view.statusV2);
  const mode = isReVerify ? 're-verify' : 'first-verify';

  const handleSubmit = async (payload: Parameters<typeof verifyWarehouse.mutateAsync>[0]['payload']) => {
    const result = await verifyWarehouse.mutateAsync({ orderId: view.id, payload });
    setResultStatus(result.statusV2 === 'ON_HOLD' ? 'on_hold' : 'verified');
    setVerified(true);
    return result;
  };

  const handleUploadImages = async (orderId: string, files: File[]) => {
    for (const file of files) await uploadImage.mutateAsync({ orderId, file });
  };

  const hint = isD2D
    ? 'Fill weight, CBM and upload goods photos to verify'
    : 'Fill weight, dimensions and select transport mode to verify';

  const nextLabel = currentIndex + 1 < totalCount ? 'Next order →' : 'Finish →';

  // ── Verify form (always rendered; modal overlays on success) ─────────────────
  return (
    <QueueShell
      queueType="verify"
      currentIndex={currentIndex}
      totalCount={totalCount}
      onExit={onExit}
      onSkip={onSkip}
      hint={hint}
      primaryLabel={isReVerify ? 'Update packages →' : 'Mark verified →'}
      isPending={verifyWarehouse.isPending}
      onPrimary={() => {
        if (verifyWarehouse.isPending || verified) return;
        const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
        form?.requestSubmit();
      }}
    >
      <div className="space-y-4">
        <OrderSummaryCard view={view} />

        {/* Images toggle */}
        <button
          type="button"
          onClick={() => setShowImages((v) => !v)}
          className={cn(
            'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition',
            showImages
              ? 'border-brand-300 bg-brand-50 text-brand-700'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
          )}
        >
          <span className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Package photos
            {images.length > 0 && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                {images.length}
              </span>
            )}
          </span>
          <span>{showImages ? 'Hide' : 'Show'}</span>
        </button>

        {showImages && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <ImageGallery
              orderId={view.id}
              images={images}
              isLoading={imagesQuery.isLoading}
              error={imagesQuery.error instanceof Error ? imagesQuery.error.message : null}
              canDelete={false}
              isUploading={uploadImage.isPending}
              onUpload={handleUploadImages}
              onDelete={async () => {}}
            />
          </div>
        )}

        {/* Verify form */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <WarehouseVerifyForm
            view={view}
            isD2D={isD2D}
            imageCount={images.length}
            canApproveOverride={canApproveOverride}
            isPending={verifyWarehouse.isPending}
            mode={mode}
            initialPackages={goodsBreakdown}
            formId={FORM_ID}
            onSwitchToImages={() => setShowImages(true)}
            onSubmit={handleSubmit}
          />
        </div>

        {verifyWarehouse.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {verifyWarehouse.error instanceof Error
              ? verifyWarehouse.error.message
              : 'Verification failed — please try again'}
          </div>
        )}
      </div>

      {/* ── Success / On-hold modal ─────────────────────────────────────────── */}
      {verified && resultStatus === 'on_hold' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="h-1 bg-amber-500" />
            <div className="flex items-start gap-4 px-7 pt-6 pb-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="text-base font-semibold text-gray-900">Order placed on hold</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  This order has been flagged for restricted item review and is now in the review queue. It won't advance until the hold is cleared.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-100 mx-7" />
            <div className="px-7 py-5">
              <OrderSummaryCard view={view} className="w-full" />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-7 py-4">
              <button
                type="button"
                onClick={onExit}
                className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                Go to review queue →
              </button>
              <button
                type="button"
                onClick={onNext}
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
              >
                {nextLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {verified && resultStatus === 'verified' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="h-1 bg-emerald-500" />
            <div className="flex items-start gap-4 px-7 pt-6 pb-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="text-base font-semibold text-gray-900">
                  {isReVerify ? 'Packages updated' : 'Order verified'}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {isReVerify
                    ? 'Package list updated — charge will recalculate automatically.'
                    : 'Order is now priced and queued for payment collection.'}
                </p>
              </div>
            </div>
            <div className="border-t border-gray-100 mx-7" />
            <div className="px-7 py-5">
              <OrderSummaryCard view={view} className="w-full" />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-7 py-4">
              <button
                type="button"
                onClick={onNext}
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
              >
                {nextLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </QueueShell>
  );
}
