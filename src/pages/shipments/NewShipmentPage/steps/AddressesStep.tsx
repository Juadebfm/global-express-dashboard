import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { ORIGIN_WAREHOUSE, DESTINATION_OFFICE } from '../types';

export function AddressesStep(): ReactElement {
  const { t } = useTranslation('shipments');

  return (
    <section className="space-y-6">
      {/* Origin — Korea warehouse */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-brand-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('newShipment.originAddress.title')}
          </h3>
        </div>
        <p className="mt-1 text-sm text-gray-400">
          {t('newShipment.originAddress.subtitle')}
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase text-gray-500">
              {t('newShipment.originAddress.companyName')}
            </span>
            <input
              type="text"
              value={ORIGIN_WAREHOUSE.company}
              readOnly
              className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-gray-500">
              {t('newShipment.originAddress.phoneNumber')}
            </span>
            <input
              type="tel"
              value={ORIGIN_WAREHOUSE.phone}
              readOnly
              className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <span className="text-xs font-semibold uppercase text-gray-500">
              {t('newShipment.originAddress.address')}
            </span>
            <input
              type="text"
              value={ORIGIN_WAREHOUSE.address}
              readOnly
              className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Destination — Lagos office */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-brand-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('newShipment.destinationAddress.title')}
          </h3>
        </div>
        <p className="mt-1 text-sm text-gray-400">
          {t('newShipment.destinationAddress.subtitle')}
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase text-gray-500">
              {t('newShipment.destinationAddress.companyName')}
            </span>
            <input
              type="text"
              value={DESTINATION_OFFICE.company}
              readOnly
              className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-gray-500">
              {t('newShipment.destinationAddress.phoneNumber')}
            </span>
            <input
              type="tel"
              value={DESTINATION_OFFICE.phone}
              readOnly
              className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <span className="text-xs font-semibold uppercase text-gray-500">
              {t('newShipment.destinationAddress.address')}
            </span>
            <input
              type="text"
              value={DESTINATION_OFFICE.address}
              readOnly
              className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
