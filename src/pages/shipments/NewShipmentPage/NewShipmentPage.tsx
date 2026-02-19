
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Package,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AppShell } from '@/pages/shared';
import { Button } from '@/components/ui';
import { useAuth, useDashboardData } from '@/hooks';
import { ROUTES } from '@/constants';
import { cn } from '@/utils';

type StepKey = 'shipment' | 'addresses' | 'packages' | 'services' | 'review';

interface StepDefinition {
  id: StepKey;
  label: string;
  description: string;
}

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

const steps: StepDefinition[] = [
  { id: 'shipment', label: 'Shipment Type', description: 'Define shipment basics' },
  { id: 'addresses', label: 'Addresses', description: 'Origin and destination' },
  { id: 'packages', label: 'Package Details', description: 'Add item details' },
  { id: 'services', label: 'Services', description: 'Service preferences' },
  { id: 'review', label: 'Review', description: 'Confirm and estimate' },
];

const shipmentTypes = [
  { value: 'standard', label: 'Standard Package' },
  { value: 'document', label: 'Document Envelope' },
  { value: 'freight', label: 'Freight / Pallet' },
  { value: 'bulk', label: 'Bulk Cargo' },
];

const deliveryPriorities = [
  { value: 'standard', label: 'Standard', eta: '5-7 business days', price: '$20.00' },
  { value: 'express', label: 'Express', eta: '2-3 business days', price: '$45.89' },
  { value: 'overnight', label: 'Overnight', eta: 'Next business day', price: '$89.99' },
  { value: 'economy', label: 'Economy', eta: '7-10 business days', price: '$12.50' },
];

const carrierOptions: DropdownOption[] = [
  { value: 'fedex', label: 'FedEx' },
  { value: 'skyjet', label: 'SkyJet' },
  { value: 'oceanwave', label: 'OceanWave' },
  { value: 'seacross', label: 'SeaCross' },
  { value: 'cargomax', label: 'CargoMax' },
  { value: 'ups', label: 'UPS' },
];

const serviceOptions: DropdownOption[] = [
  { value: 'road', label: 'Road' },
  { value: 'air', label: 'Air' },
  { value: 'ocean', label: 'Ocean' },
];

const priorityOptions: DropdownOption[] = [
  { value: 'express', label: 'Express' },
  { value: 'standard', label: 'Standard' },
  { value: 'economy', label: 'Economy' },
];

const invoiceTermsOptions: DropdownOption[] = [
  { value: 'due_on_receipt', label: 'Due on receipt' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
];

const categoryOptions: DropdownOption[] = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'pharma', label: 'Pharmaceuticals' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'industrial', label: 'Industrial Parts' },
  { value: 'documents', label: 'Documents' },
];

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateLabel = (value: Date | null): string => {
  if (!value) return 'Select date';
  return value.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const buildCalendarDays = (year: number, month: number): Array<{
  date: Date;
  day: number;
  isCurrentMonth: boolean;
}> => {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const startDay = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ date: Date; day: number; isCurrentMonth: boolean }> = [];

  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startDay + 1;
    if (dayIndex <= 0) {
      const day = daysInPrevMonth + dayIndex;
      cells.push({
        date: new Date(Date.UTC(year, month - 1, day)),
        day,
        isCurrentMonth: false,
      });
    } else if (dayIndex > daysInMonth) {
      const day = dayIndex - daysInMonth;
      cells.push({
        date: new Date(Date.UTC(year, month + 1, day)),
        day,
        isCurrentMonth: false,
      });
    } else {
      cells.push({
        date: new Date(Date.UTC(year, month, dayIndex)),
        day: dayIndex,
        isCurrentMonth: true,
      });
    }
  }

  return cells;
};

interface DatePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
}

function DatePicker({ label, value, onChange }: DatePickerProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'calendar' | 'year'>('calendar');
  const [month, setMonth] = useState(() => (value ? value.getUTCMonth() : 2));
  const [year, setYear] = useState(() => (value ? value.getUTCFullYear() : 2026));

  useEffect(() => {
    if (!value) return;
    setMonth(value.getUTCMonth());
    setYear(value.getUTCFullYear());
  }, [value]);

  const monthLabel = useMemo(() => {
    const date = new Date(Date.UTC(year, month, 1));
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [month, year]);

  const days = useMemo(() => buildCalendarDays(year, month), [month, year]);

  return (
    <div className="relative">
      <span className="text-xs font-semibold uppercase text-gray-500">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="mt-2 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 hover:border-brand-400"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {formatDateLabel(value)}
        </span>
        <Calendar className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-10 mt-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
          {view === 'calendar' ? (
            <>
              <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    if (month === 0) {
                      setMonth(11);
                      setYear((prev) => prev - 1);
                    } else {
                      setMonth((prev) => prev - 1);
                    }
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView('year')}
                  className="text-brand-600"
                >
                  {monthLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (month === 11) {
                      setMonth(0);
                      setYear((prev) => prev + 1);
                    } else {
                      setMonth((prev) => prev + 1);
                    }
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase text-gray-400">
                {daysOfWeek.map((day) => (
                  <span key={day} className="text-center">
                    {day}
                  </span>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2 text-sm">
                {days.map((item) => {
                  const isSelected =
                    value &&
                    item.date.getUTCFullYear() === value.getUTCFullYear() &&
                    item.date.getUTCMonth() === value.getUTCMonth() &&
                    item.date.getUTCDate() === value.getUTCDate();

                  return (
                    <button
                      key={`${item.date.toISOString()}-${item.day}`}
                      type="button"
                      onClick={() => {
                        onChange(item.date);
                        setIsOpen(false);
                        setView('calendar');
                      }}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full',
                        item.isCurrentMonth
                          ? 'text-gray-700 hover:bg-brand-50'
                          : 'text-gray-300',
                        isSelected && 'bg-brand-500 text-white hover:bg-brand-500'
                      )}
                    >
                      {item.day}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm font-semibold text-gray-500">Select Year</p>
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setYear((prev) => prev - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Previous year"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView('calendar')}
                  className="rounded-2xl bg-gray-50 px-6 py-2 text-2xl font-semibold text-gray-800"
                >
                  {year}
                </button>
                <button
                  type="button"
                  onClick={() => setYear((prev) => prev + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-500"
                  aria-label="Next year"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
interface DropdownSelectProps {
  label: string;
  value: string;
  placeholder: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}

function DropdownSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
}: DropdownSelectProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const activeLabel = options.find((option) => option.value === value)?.label;

  return (
    <div className="relative">
      {label && <span className="text-xs font-semibold uppercase text-gray-500">{label}</span>}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'mt-2 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 hover:border-brand-400',
          !label && 'mt-0'
        )}
      >
        <span className={activeLabel ? 'text-gray-900' : 'text-gray-400'}>
          {activeLabel ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-10 mt-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
          {label && (
            <p className="mb-2 text-xs font-semibold uppercase text-gray-400">{label}</p>
          )}
          <div className="space-y-2">
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50',
                    isActive && 'bg-brand-50 text-brand-600'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border',
                      isActive ? 'border-brand-500' : 'border-gray-300'
                    )}
                  >
                    {isActive && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                  </span>
                  <div>
                    <p className="font-medium">{option.label}</p>
                    {option.description && (
                      <p className="text-xs text-gray-400">{option.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function NewShipmentPage(): ReactElement {
  const { data, isLoading, error } = useDashboardData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [shipmentType, setShipmentType] = useState('standard');
  const [priority, setPriority] = useState('standard');
  const [pickupDate, setPickupDate] = useState<Date | null>(new Date(Date.UTC(2026, 1, 20)));
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [carrier, setCarrier] = useState('skyjet');
  const [serviceLevel, setServiceLevel] = useState('air');
  const [servicePriority, setServicePriority] = useState('express');
  const [category, setCategory] = useState('electronics');
  const [sendInvoice, setSendInvoice] = useState(true);
  const [invoiceRecipient, setInvoiceRecipient] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoiceTerms, setInvoiceTerms] = useState('net_30');
  const [invoiceDueDate, setInvoiceDueDate] = useState<Date | null>(
    new Date(Date.UTC(2026, 1, 27))
  );
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const progress = Math.round(((activeStep + 1) / steps.length) * 100);
  const canInvoice = Boolean(user && user.role !== 'user');

  const goNext = (): void => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goPrevious = (): void => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handlePrimaryAction = (): void => {
    if (activeStep < steps.length - 1) {
      goNext();
      return;
    }

    if (canInvoice && sendInvoice) {
      navigate(`${ROUTES.SHIPMENT_INVOICE}?created=1`);
      return;
    }

    setShowConfirmation(true);
  };

  return (
    <AppShell data={data} isLoading={isLoading} error={error} loadingLabel="Loading new shipment...">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Create New Shipment</h1>
          <p className="mt-1 text-sm text-gray-500">
            Follow the steps below to create and schedule your shipment
          </p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Step {activeStep + 1} of {steps.length}
            </span>
            <span>{progress}% Complete</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-400 sm:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step.id} className="space-y-1">
                <p
                  className={cn(
                    'text-xs font-semibold',
                    index <= activeStep ? 'text-gray-700' : 'text-gray-400'
                  )}
                >
                  {step.label}
                </p>
                <p className="hidden text-[11px] sm:block">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
        {activeStep === 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Shipment Type & Priority</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select the type of shipment and delivery priority
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
              <div>
                <p className="text-sm font-semibold text-gray-700">Shipment Type</p>
                <div className="mt-4 space-y-3">
                  {shipmentTypes.map((item) => (
                    <label
                      key={item.value}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition',
                        shipmentType === item.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-700 hover:border-brand-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="shipment-type"
                        value={item.value}
                        checked={shipmentType === item.value}
                        onChange={() => setShipmentType(item.value)}
                        className="sr-only"
                      />
                      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-brand-500">
                        {shipmentType === item.value && (
                          <span className="h-2 w-2 rounded-full bg-brand-500" />
                        )}
                      </span>
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700">Delivery Priority</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {deliveryPriorities.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-2xl border p-4 text-sm transition',
                        priority === option.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-700 hover:border-brand-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="delivery-priority"
                        value={option.value}
                        checked={priority === option.value}
                        onChange={() => setPriority(option.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-brand-500">
                          {priority === option.value && (
                            <span className="h-2 w-2 rounded-full bg-brand-500" />
                          )}
                        </span>
                        <div>
                          <p className="font-semibold">{option.label}</p>
                          <p className="text-xs text-gray-500">{option.eta}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                        {option.price}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <DatePicker label="Pick-up Date" value={pickupDate} onChange={setPickupDate} />
                  <DatePicker
                    label="Preferred Delivery Date"
                    value={deliveryDate}
                    onChange={setDeliveryDate}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      Pick-up Time
                    </span>
                    <div className="relative mt-2">
                      <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        defaultValue="09:30"
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      Delivery Time
                    </span>
                    <div className="relative mt-2">
                      <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        defaultValue="16:00"
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        {activeStep === 1 && (
          <section className="space-y-6">
            {[
              { title: 'Origin Address', subtitle: 'Enter the pickup location details' },
              { title: 'Destination Address', subtitle: 'Enter the delivery location details' },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-1 text-sm text-gray-400">{card.subtitle}</p>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      Company Name
                    </span>
                    <input
                      type="text"
                      placeholder="Select type"
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      Contact Name
                    </span>
                    <input
                      type="text"
                      placeholder="Select type"
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      Address
                    </span>
                    <input
                      type="text"
                      placeholder="Select type"
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">City</span>
                    <div className="relative mt-2">
                      <select className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 focus:border-brand-500 focus:outline-none">
                        <option>Select type</option>
                        <option>Lagos</option>
                        <option>Accra</option>
                        <option>New York</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      State/Province
                    </span>
                    <div className="relative mt-2">
                      <select className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 focus:border-brand-500 focus:outline-none">
                        <option>Select priority</option>
                        <option>CA</option>
                        <option>TX</option>
                        <option>NY</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      ZIP/Postal Code
                    </span>
                    <div className="relative mt-2">
                      <select className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 focus:border-brand-500 focus:outline-none">
                        <option>Select priority</option>
                        <option>90001</option>
                        <option>10001</option>
                        <option>77001</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      Phone Number
                    </span>
                    <input
                      type="tel"
                      placeholder="Select type"
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      Email Address
                    </span>
                    <input
                      type="email"
                      placeholder="Select type"
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
        {activeStep === 2 && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Package Details</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Add items to your shipment
                  </p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                  Item 1
                </span>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    Description
                  </span>
                  <input
                    type="text"
                    placeholder="Select type"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    Category
                  </span>
                  <DropdownSelect
                    label=""
                    value={category}
                    placeholder="Select type"
                    options={categoryOptions}
                    onChange={setCategory}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Quantity</span>
                  <input
                    type="number"
                    placeholder="Enter qty"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    Weight (lbs)
                  </span>
                  <input
                    type="number"
                    placeholder="Enter weight"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Value ($)</span>
                  <input
                    type="number"
                    placeholder="Enter value"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <label className="mt-8 flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                  Hazardous
                </label>
              </div>

              <div className="mt-4">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  Dimensions (inches)
                </span>
                <div className="mt-2 grid gap-4 lg:grid-cols-3">
                  <input
                    type="number"
                    placeholder="Length"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Width"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Height"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    Customer's Name
                  </span>
                  <input
                    type="text"
                    placeholder="Type here"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Email</span>
                  <input
                    type="email"
                    placeholder="Type here"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Number</span>
                  <input
                    type="tel"
                    placeholder="Type here"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white py-4 text-sm font-semibold text-brand-600 hover:border-brand-500"
            >
              <Plus className="h-4 w-4" />
              Add Another Item
            </button>

            <div className="rounded-2xl bg-brand-100 px-6 py-5">
              <div className="grid gap-4 text-center text-sm font-semibold text-gray-700 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-semibold">1</p>
                  <p className="text-xs uppercase text-gray-500">Total Items</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">0.0 lbs</p>
                  <p className="text-xs uppercase text-gray-500">Total Weight</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">$0.00</p>
                  <p className="text-xs uppercase text-gray-500">Total Value</p>
                </div>
              </div>
            </div>
          </section>
        )}
        {activeStep === 3 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Special Services & Options
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Configure additional services for your shipment
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-4">
                {['Insurance Coverage', 'Signature Required', 'White Glove', 'Cold Chain'].map(
                  (service) => (
                    <div
                      key={service}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{service}</p>
                        <p className="text-xs text-gray-400">
                          Protect your shipment against loss or damage
                        </p>
                      </div>
                      <button
                        type="button"
                        className="relative h-6 w-11 rounded-full bg-gray-200 transition"
                        aria-label={`Toggle ${service}`}
                      >
                        <span className="absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow" />
                      </button>
                    </div>
                  )
                )}
              </div>

              <div className="space-y-4">
                <DropdownSelect
                  label="Preferred Carrier"
                  value={carrier}
                  placeholder="Select type"
                  options={carrierOptions}
                  onChange={setCarrier}
                />
                <DropdownSelect
                  label="Service Level"
                  value={serviceLevel}
                  placeholder="Select type"
                  options={serviceOptions}
                  onChange={setServiceLevel}
                />
                <DropdownSelect
                  label="Priority"
                  value={servicePriority}
                  placeholder="Select type"
                  options={priorityOptions}
                  onChange={setServicePriority}
                />
              </div>
            </div>

            <div className="mt-6">
              <span className="text-xs font-semibold uppercase text-gray-500">
                Special Instruction
              </span>
              <textarea
                rows={3}
                placeholder="Enter any special handling instructions, delivery notes,"
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-600">
              <ShieldCheck className="mt-0.5 h-4 w-4" />
              Additional services may affect shipping cost and delivery time. Review the
              cost estimate in the next step.
            </div>
          </section>
        )}
        {activeStep === 4 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Review & Cost Estimate</h2>
            <p className="mt-1 text-sm text-gray-400">
              Review your shipment details and get a cost estimate
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Shipment Summary</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Type</span>
                      <span className="font-semibold text-gray-800">Standard</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Priority</span>
                      <span className="font-semibold text-gray-800">Standard</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total Items</span>
                      <span className="font-semibold text-gray-800">1</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total Weight</span>
                      <span className="font-semibold text-gray-800">0.0 lbs</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                      <span>Total Value</span>
                      <span className="font-semibold text-gray-800">$0.00</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700">Route</p>
                  <div className="mt-3 text-sm text-gray-600">
                    <p className="font-semibold text-gray-800">From</p>
                    <p className="text-xs text-gray-400">Origin Company</p>
                    <p>Marina port, Lagos Island, Lagos state, Nigeria.</p>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p className="font-semibold text-gray-800">To</p>
                    <p className="text-xs text-gray-400">Destination Company</p>
                    <p>Aquatic port, Maryland, New York, USA.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Package className="h-4 w-4 text-brand-500" />
                  Cost Breakdown
                </div>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Base Shipping</span>
                    <span className="font-semibold">$15.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Weight Charge</span>
                    <span className="font-semibold">$0.00</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-gray-800">
                    <span className="font-semibold">Total Estimated Cost</span>
                    <span className="font-semibold">$15.00</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                >
                  <Check className="h-4 w-4" />
                  Recalculate Estimation
                </button>

                <p className="mt-4 text-xs text-gray-400">
                  This is an estimate. Final cost may vary based on actual dimensions
                  and carrier rates.
                </p>
              </div>
            </div>

            {canInvoice && (
              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Send Invoice to Client
                    </p>
                    <p className="text-xs text-gray-400">
                      Generate and email an invoice when the shipment is created.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSendInvoice((prev) => !prev)}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition',
                      sendInvoice ? 'bg-brand-500' : 'bg-gray-200'
                    )}
                    aria-label="Toggle invoice"
                  >
                    <span
                      className={cn(
                        'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition',
                        sendInvoice ? 'left-6' : 'left-1'
                      )}
                    />
                  </button>
                </div>

                {sendInvoice && (
                  <>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <span className="text-xs font-semibold uppercase text-gray-500">
                          Client Name
                        </span>
                        <input
                          type="text"
                          value={invoiceRecipient}
                          onChange={(event) => setInvoiceRecipient(event.target.value)}
                          placeholder="Client company or contact"
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase text-gray-500">
                          Billing Email
                        </span>
                        <input
                          type="email"
                          value={invoiceEmail}
                          onChange={(event) => setInvoiceEmail(event.target.value)}
                          placeholder="billing@client.com"
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <DropdownSelect
                        label="Invoice Terms"
                        value={invoiceTerms}
                        placeholder="Select terms"
                        options={invoiceTermsOptions}
                        onChange={setInvoiceTerms}
                      />
                      <DatePicker
                        label="Invoice Due Date"
                        value={invoiceDueDate}
                        onChange={setInvoiceDueDate}
                      />
                    </div>

                    <div className="mt-4">
                      <span className="text-xs font-semibold uppercase text-gray-500">
                        Notes
                      </span>
                      <textarea
                        rows={3}
                        value={invoiceNotes}
                        onChange={(event) => setInvoiceNotes(event.target.value)}
                        placeholder="Add payment or handling notes"
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={goPrevious}>
            Previous
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" className="border-gray-300">
              Save Draft
            </Button>
            <Button size="sm" onClick={handlePrimaryAction}>
              {activeStep === steps.length - 1
                ? canInvoice && sendInvoice
                  ? 'Create Shipment & Send Invoice'
                  : 'Create Shipment'
                : 'Next'}
            </Button>
          </div>
        </div>
      </div>
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setShowConfirmation(false)}
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
                <p className="text-lg font-semibold text-gray-900">Shipment created</p>
                <p className="text-sm text-gray-500">
                  Your shipment has been saved successfully.
                </p>
              </div>
            </div>

            {canInvoice ? (
              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                You can draft and send an invoice to the client now or later.
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Invoice actions are available to Staff, Admin, and Super Admin roles.
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              {canInvoice && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowConfirmation(false)}
                >
                  Later
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  if (!canInvoice) {
                    setShowConfirmation(false);
                    return;
                  }
                  navigate(`${ROUTES.SHIPMENT_INVOICE}?created=1`);
                }}
              >
                {canInvoice ? 'Open Invoice Draft' : 'Done'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
