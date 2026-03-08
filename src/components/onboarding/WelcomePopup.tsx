import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, X } from 'lucide-react';
import { ROUTES } from '@/constants';

interface WelcomePopupProps {
  displayName: string;
  onDismiss: () => void;
}

export function WelcomePopup({ displayName, onDismiss }: WelcomePopupProps): ReactElement {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();

  const firstName = displayName.split(' ')[0] || displayName;

  const handleCreateShipment = (): void => {
    onDismiss();
    navigate(ROUTES.NEW_SHIPMENT);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label={t('welcome.closeAriaLabel')}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
          <Package className="h-8 w-8 text-brand-500" />
        </div>

        {/* Content */}
        <h2 className="text-center text-xl font-semibold text-gray-900">
          {t('welcome.title', { name: firstName })}
        </h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-gray-500">
          {t('welcome.description')}
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={handleCreateShipment}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          {t('welcome.cta')}
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Secondary dismiss */}
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 w-full text-center text-sm text-gray-400 transition hover:text-gray-600"
        >
          {t('welcome.dismiss')}
        </button>
      </div>
    </div>
  );
}
