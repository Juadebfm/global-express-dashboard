import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  MapPin,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '@/pages/shared';
import { useDashboardData } from '@/hooks';
import { cn } from '@/utils';

interface TrackingTimelineItem {
  id: string;
  title: string;
  location: string;
  date: string;
}

interface TrackingDocument {
  id: string;
  name: string;
  size: string;
  date: string;
}

interface TrackingRecord {
  trackingNumber: string;
  carrier: string;
  packageCount: number;
  status: 'in_transit' | 'delivered' | 'pending';
  estimatedDelivery: string;
  currentLocation: string;
  lastUpdated: string;
  from: {
    city: string;
    note: string;
  };
  to: {
    city: string;
    note: string;
  };
  timeline: TrackingTimelineItem[];
  documents: TrackingDocument[];
  details: {
    trackingNumber: string;
    shipmentType: string;
    carrier: string;
    priority: string;
    account: string;
    customer: string;
    contact: string;
    phone: string;
    weight: string;
    dimensions: string;
    packageCount: string;
    temperature: string;
    instructions: string;
  };
}

type TrackingTab = 'timeline' | 'details' | 'documents';

const trackingRecords: TrackingRecord[] = [
  {
    trackingNumber: 'SKJ-6474837396',
    carrier: 'Skyjet Shipment',
    packageCount: 24,
    status: 'in_transit',
    estimatedDelivery: 'Friday Feb. 20th | 2026',
    currentLocation: 'Columbus, OH',
    lastUpdated: '02:22 PM | Jan. 31',
    from: {
      city: 'New York, NY',
      note: 'Shipped on Wednesday Jan. 28th | 2026',
    },
    to: {
      city: 'Houston, TX',
      note: 'Expected by Friday Feb. 20th | 2026',
    },
    timeline: [
      {
        id: 'tl-1',
        title: 'Picked up by carrier',
        location: 'New York, NY',
        date: 'Wed, Jan 28th, 09:00 AM',
      },
      {
        id: 'tl-2',
        title: 'Departed from Facility',
        location: 'Los Angeles, CA',
        date: 'Fri, Jan 30th, 08:00 AM',
      },
      {
        id: 'tl-3',
        title: 'Arrived at sort facility',
        location: 'Phoenix, AZ',
        date: 'Sat, Jan 31st, 10:00 AM',
      },
      {
        id: 'tl-4',
        title: 'Departed sort facility',
        location: 'Phoenix, AZ',
        date: 'Sat, Jan 31st, 12:00 PM',
      },
      {
        id: 'tl-5',
        title: 'In transit to destination',
        location: 'Columbus, OH',
        date: 'Sat, Feb. 1st, 09:00 AM',
      },
    ],
    documents: [
      { id: 'doc-1', name: 'Bill of Lading.pdf', size: '1.2 MB', date: '2026-01-15' },
      { id: 'doc-2', name: 'Commercial Invoice.pdf', size: '0.8 MB', date: '2026-01-15' },
      { id: 'doc-3', name: 'Packing List.pdf', size: '0.5 MB', date: '2026-01-15' },
    ],
    details: {
      trackingNumber: 'TRK-2024-001234',
      shipmentType: 'LTL',
      carrier: 'FastFreight Logistics',
      priority: 'Standard',
      account: 'ACC-12345',
      customer: 'Acme Corporation',
      contact: 'John Smith',
      phone: '+1 (555) 123-4567',
      weight: '1,250 kg',
      dimensions: '240 x 120 x 80 cm',
      packageCount: '3',
      temperature: '18C',
      instructions: 'Handle with care. Signature required upon delivery.',
    },
  },
  {
    trackingNumber: 'SKJ-3894720837',
    carrier: 'Oceanline Freight',
    packageCount: 16,
    status: 'pending',
    estimatedDelivery: 'Monday Feb. 24th | 2026',
    currentLocation: 'Newark, NJ',
    lastUpdated: '08:10 AM | Feb. 12',
    from: {
      city: 'Newark, NJ',
      note: 'Processing at origin warehouse',
    },
    to: {
      city: 'Austin, TX',
      note: 'Estimated arrival Feb. 24th | 2026',
    },
    timeline: [
      {
        id: 'tl-1b',
        title: 'Shipment created',
        location: 'Newark, NJ',
        date: 'Mon, Feb 10th, 11:20 AM',
      },
      {
        id: 'tl-2b',
        title: 'Processing at origin',
        location: 'Newark, NJ',
        date: 'Wed, Feb 12th, 08:10 AM',
      },
    ],
    documents: [
      { id: 'doc-1b', name: 'Shipping Label.pdf', size: '0.3 MB', date: '2026-02-10' },
      { id: 'doc-2b', name: 'Insurance Policy.pdf', size: '0.6 MB', date: '2026-02-10' },
    ],
    details: {
      trackingNumber: 'TRK-2024-004587',
      shipmentType: 'FTL',
      carrier: 'Oceanline Freight',
      priority: 'Economy',
      account: 'ACC-88920',
      customer: 'Summit Wholesale',
      contact: 'Rita Stone',
      phone: '+1 (555) 989-2244',
      weight: '3,400 kg',
      dimensions: '320 x 150 x 120 cm',
      packageCount: '6',
      temperature: 'Ambient',
      instructions: 'Keep upright. Do not stack above 2 pallets.',
    },
  },
  {
    trackingNumber: 'SKJ-4628945774',
    carrier: 'Skyjet Shipment',
    packageCount: 12,
    status: 'delivered',
    estimatedDelivery: 'Delivered Feb. 11th | 2026',
    currentLocation: 'Dallas, TX',
    lastUpdated: '03:12 PM | Feb. 11',
    from: {
      city: 'Chicago, IL',
      note: 'Picked up Feb. 8th | 2026',
    },
    to: {
      city: 'Dallas, TX',
      note: 'Delivered Feb. 11th | 2026',
    },
    timeline: [
      {
        id: 'tl-1c',
        title: 'Picked up by carrier',
        location: 'Chicago, IL',
        date: 'Sat, Feb 8th, 09:40 AM',
      },
      {
        id: 'tl-2c',
        title: 'Arrived at destination hub',
        location: 'Dallas, TX',
        date: 'Tue, Feb 11th, 12:15 PM',
      },
      {
        id: 'tl-3c',
        title: 'Delivered',
        location: 'Dallas, TX',
        date: 'Tue, Feb 11th, 03:12 PM',
      },
    ],
    documents: [
      { id: 'doc-1c', name: 'Proof of Delivery.pdf', size: '0.4 MB', date: '2026-02-11' },
      { id: 'doc-2c', name: 'Invoice.pdf', size: '0.7 MB', date: '2026-02-11' },
    ],
    details: {
      trackingNumber: 'TRK-2024-008912',
      shipmentType: 'Parcel',
      carrier: 'Skyjet Shipment',
      priority: 'Express',
      account: 'ACC-55571',
      customer: 'Nova Health',
      contact: 'Patrick Lowe',
      phone: '+1 (555) 712-8810',
      weight: '240 kg',
      dimensions: '180 x 80 x 60 cm',
      packageCount: '2',
      temperature: 'Cold chain',
      instructions: 'Deliver to receiving dock before 4:00 PM.',
    },
  },
];

const recentTrackingNumbers = trackingRecords.map((record) => record.trackingNumber);

const statusLabels: Record<TrackingRecord['status'], string> = {
  in_transit: 'In-transit',
  delivered: 'Delivered',
  pending: 'Pending',
};

const statusStyles: Record<TrackingRecord['status'], string> = {
  in_transit: 'bg-blue-50 text-blue-600',
  delivered: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
};

export function TrackShipmentPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const [trackingInput, setTrackingInput] = useState(trackingRecords[0].trackingNumber);
  const [activeTrackingNumber, setActiveTrackingNumber] = useState(
    trackingRecords[0].trackingNumber
  );
  const [activeTab, setActiveTab] = useState<TrackingTab>('timeline');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trackingLookup = useMemo(() => {
    const map = new Map<string, TrackingRecord>();
    trackingRecords.forEach((record) => map.set(record.trackingNumber, record));
    return map;
  }, []);

  const activeRecord = trackingLookup.get(activeTrackingNumber) ?? trackingRecords[0];

  const handleTrack = (): void => {
    const normalized = trackingInput.trim().toUpperCase();
    if (!normalized) {
      setErrorMessage('Enter a tracking number to continue.');
      return;
    }
    const record = trackingLookup.get(normalized);
    if (!record) {
      setErrorMessage('Tracking number not found. Try another.');
      return;
    }
    setErrorMessage(null);
    setActiveTrackingNumber(normalized);
    setActiveTab('timeline');
  };

  const handleRecentClick = (value: string): void => {
    setTrackingInput(value);
    setErrorMessage(null);
    setActiveTrackingNumber(value);
    setActiveTab('timeline');
  };

  return (
    <AppShell
      data={data}
      isLoading={isLoading}
      error={error}
      loadingLabel="Loading tracking..."
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-gray-900">Track your shipment</h1>
          <p className="mt-1 text-sm text-gray-400">
            Enter Tracking number to get real time update on your shipment
          </p>

          <div className="mt-6">
            <label className="text-sm font-semibold text-gray-700">
              Enter your Tracking Number
            </label>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={trackingInput}
                onChange={(event) => setTrackingInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleTrack();
                  }
                }}
                className="w-full flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={handleTrack}
                className="rounded-xl bg-brand-500 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Track Shipment
              </button>
            </div>
            {errorMessage && (
              <p className="mt-3 text-sm text-rose-600">{errorMessage}</p>
            )}
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Recent Tracking Number
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {recentTrackingNumbers.map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => handleRecentClick(number)}
                  className={cn(
                    'rounded-xl border px-5 py-2.5 text-sm font-semibold transition',
                    activeTrackingNumber === number
                      ? 'border-brand-500 bg-brand-50 text-brand-600'
                      : 'border-brand-200 text-gray-700 hover:border-brand-500'
                  )}
                >
                  {number}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold text-gray-900">
              Shipment {activeRecord.trackingNumber}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="inline-flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                {activeRecord.carrier}
              </span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>{activeRecord.packageCount} Packages</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Status</p>
              <span
                className={cn(
                  'mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                  statusStyles[activeRecord.status]
                )}
              >
                {statusLabels[activeRecord.status]}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Estimated Delivery</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                {activeRecord.estimatedDelivery}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Current location</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                {activeRecord.currentLocation}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Last Updated</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                {activeRecord.lastUpdated}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">From</p>
                <div className="mt-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">{activeRecord.from.city}</p>
                  <p className="mt-1 text-xs text-gray-500">{activeRecord.from.note}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
                <ShieldCheck className="h-4 w-4" />
                In-transit
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">To</p>
                <div className="mt-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">{activeRecord.to.city}</p>
                  <p className="mt-1 text-xs text-gray-500">{activeRecord.to.note}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center gap-8 border-b border-gray-100">
            {(
              [
                { id: 'timeline', label: 'Timeline' },
                { id: 'details', label: 'Details' },
                { id: 'documents', label: 'Documents' },
              ] as Array<{ id: TrackingTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative pb-3 text-sm font-semibold transition',
                  activeTab === tab.id ? 'text-brand-600' : 'text-gray-500'
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-brand-500" />
                )}
              </button>
            ))}
          </div>

          {activeTab === 'timeline' && (
            <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6">
              <h3 className="text-xl font-semibold text-gray-900">Shipment Timeline</h3>
              <p className="mt-1 text-sm text-gray-500">
                Track the journey of your shipment from origin to destination
              </p>
              <div className="mt-6 space-y-5">
                {activeRecord.timeline.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold',
                          index === 0
                            ? 'border-brand-500 text-brand-600'
                            : 'border-gray-300 text-gray-400'
                        )}
                      >
                        {index + 1}
                      </div>
                      {index !== activeRecord.timeline.length - 1 && (
                        <div className="h-10 w-px bg-gray-200" />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">{event.location}</p>
                      <p className="text-xs text-gray-400">{event.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6">
              <h3 className="text-xl font-semibold text-gray-900">Shipment Details</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comprehensive information about your shipment
              </p>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-700">Shipment Information</h4>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="text-xs uppercase text-gray-400">Tracking Number</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {activeRecord.details.trackingNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-400">Carrier</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {activeRecord.details.carrier}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-400">Shipment Type</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {activeRecord.details.shipmentType}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-400">Priority</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {activeRecord.details.priority}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-700">Customer Information</h4>
                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>{activeRecord.details.customer}</span>
                      <span className="text-xs text-gray-400">
                        Account #: {activeRecord.details.account}
                      </span>
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs uppercase text-gray-400">Contact</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {activeRecord.details.contact}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-400">Phone</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {activeRecord.details.phone}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-700">Package Details</h4>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="text-xs uppercase text-gray-400">Weight</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {activeRecord.details.weight}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-400">Dimensions</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {activeRecord.details.dimensions}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-400">Package Count</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {activeRecord.details.packageCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-400">Temperature</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {activeRecord.details.temperature}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-700">Special Instructions</h4>
                  <p className="mt-4 text-sm text-gray-600">
                    {activeRecord.details.instructions}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6">
              <h3 className="text-xl font-semibold text-gray-900">Shipment Documents</h3>
              <p className="mt-1 text-sm text-gray-500">
                Access and download documents related to your shipment
              </p>
              <div className="mt-6 space-y-4">
                {activeRecord.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 px-4 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {doc.size} | {doc.date}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-brand-600 hover:border-brand-500"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
