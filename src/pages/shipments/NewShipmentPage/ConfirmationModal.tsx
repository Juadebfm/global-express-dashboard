import type { ReactElement } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';
import type { ShippingEstimate } from '@/services';
import i18n from '@/i18n/i18n';

interface ConfirmationModalProps {
  isCustomer: boolean;
  trackingNumber: string | null;
  shipmentType: string;
  estimate: ShippingEstimate | null;
  onClose: () => void;
}

export function ConfirmationModal({
  isCustomer,
  trackingNumber,
  shipmentType,
  estimate,
  onClose,
}: ConfirmationModalProps): ReactElement {
  const { t } = useTranslation('shipments');
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const trackUrl = trackingNumber
    ? `${window.location.origin}${ROUTES.TRACK_PUBLIC}/${trackingNumber}`
    : '';

  const typeLabel = shipmentType === 'air' ? 'Air Freight' : 'Ocean Freight';
  const costLabel = estimate
    ? `$${estimate.estimatedCostUsd.toLocaleString(
        i18n.language === 'ko' ? 'ko-KR' : 'en-US',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      )}`
    : '';

  const shareBody = [
    'Global Express — Order Confirmation',
    `Tracking Number: ${trackingNumber}`,
    `Type: ${typeLabel}`,
    ...(costLabel ? [`Estimated Cost: ${costLabel}`] : []),
    `Track your shipment: ${trackUrl}`,
  ].join('\n');

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(shareBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 text-gray-400 transition hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {isCustomer
                ? t('newShipment.confirmation.shipmentCreated')
                : t('newShipment.confirmation.orderCreated')}
            </p>
            <p className="text-sm text-gray-500">
              {isCustomer
                ? t('newShipment.confirmation.shipmentSaved')
                : t('newShipment.confirmation.orderSaved')}
            </p>
            {trackingNumber && (
              <p className="mt-1 text-xs font-semibold text-brand-600">
                {t('newShipment.confirmation.trackingNumber', { number: trackingNumber })}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {isCustomer
            ? t('newShipment.confirmation.customerNote')
            : t('newShipment.confirmation.operatorNote')}
        </div>

        {/* Share buttons */}
        {trackingNumber && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-gray-400">
              {t('newShipment.confirmation.shareDetails')}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {/* Copy */}
              <button
                type="button"
                onClick={() => void handleCopy()}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition',
                  copied
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                    : 'border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500',
                )}
                title="Copy to clipboard"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied
                  ? t('newShipment.confirmation.copied')
                  : t('newShipment.confirmation.copy')}
              </button>

              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent(`Global Express — Tracking ${trackingNumber}`)}&body=${encodeURIComponent(shareBody)}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-brand-400 hover:text-brand-500"
                title={t('newShipment.confirmation.shareViaEmail')}
              >
                <Mail className="h-4 w-4" />
              </a>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareBody)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-green-500 hover:text-green-500"
                title={t('newShipment.confirmation.shareViaWhatsApp')}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>

              {/* KakaoTalk */}
              <a
                href={`https://story.kakao.com/share?url=${encodeURIComponent(trackUrl)}&text=${encodeURIComponent(shareBody)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-yellow-500 hover:text-yellow-500"
                title={t('newShipment.confirmation.shareViaKakaoTalk')}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.664 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 00-.656-.678l-1.928 1.866V9.282a.472.472 0 00-.944 0v2.557a.471.471 0 000 .222v2.218a.472.472 0 00.944 0v-1.58l.478-.46 1.532 2.283a.472.472 0 00.784-.527l-1.68-2.502zm-4.356-1.778h-.944v3.397a.472.472 0 00.944 0V9.282zm-2.004 3.397a.472.472 0 00.944 0V9.282a.472.472 0 00-.944 0v3.397zm-2.835-1.28l-1.1-2.117a.472.472 0 00-.841.424l.779 1.54h-.779a.472.472 0 000 .944h1.47a.472.472 0 00.471-.791z" />
                </svg>
              </a>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              onClose();
              navigate(ROUTES.ORDERS);
            }}
          >
            {t('newShipment.confirmation.done')}
          </Button>
        </div>
      </div>
    </div>
  );
}
