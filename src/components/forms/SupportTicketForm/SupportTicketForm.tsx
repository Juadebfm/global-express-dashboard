import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { AlertBanner, Button, Card, Input } from '@/components/ui';
import { cn } from '@/utils';
import {
  supportTicketCategories,
  supportTicketPriorities,
  createSupportTicketSchema,
  type SupportTicketFormData,
} from './SupportTicketForm.schema';
import type { SupportTicketFormProps } from './SupportTicketForm.types';

const defaultValues: SupportTicketFormData = {
  subject: '',
  category: 'shipment_inquiry',
  priority: 'medium',
  relatedTrackingNumber: '',
  description: '',
};

const fieldClassName =
  'w-full rounded-lg border border-[#DDE5E9] bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500';

const CATEGORY_KEYS: Record<(typeof supportTicketCategories)[number], string> = {
  shipment_inquiry: 'ticketForm.categories.shipmentInquiry',
  payment_issue: 'ticketForm.categories.paymentIssue',
  damaged_goods: 'ticketForm.categories.damagedGoods',
  document_request: 'ticketForm.categories.documentRequest',
  account_issue: 'ticketForm.categories.accountIssue',
  general: 'ticketForm.categories.general',
};

const PRIORITY_KEYS: Record<(typeof supportTicketPriorities)[number], string> = {
  low: 'ticketForm.priorities.low',
  medium: 'ticketForm.priorities.medium',
  high: 'ticketForm.priorities.high',
};

/* ── Custom dropdown ──────────────────────────────────────────── */

interface DropdownProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  error?: string;
  onChange: (value: T) => void;
}

function Dropdown<T extends string>({
  id,
  label,
  value,
  options,
  labels,
  error: fieldError,
  onChange,
}: DropdownProps<T>): ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div ref={ref} className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            'flex w-full items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-sm transition',
            open
              ? 'border-brand-500 ring-2 ring-brand-500'
              : 'border-gray-200 hover:border-gray-300',
            fieldError && !open && 'border-red-400',
          )}
        >
          <span className="text-gray-900">{labels[value]}</span>
          <ChevronDown
            className={cn('h-4 w-4 text-gray-400 transition', open && 'rotate-180')}
          />
        </button>
        {open && (
          <div className="absolute z-30 mt-1 w-full rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                  value === option
                    ? 'bg-brand-50 font-semibold text-brand-600'
                    : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {labels[option]}
              </button>
            ))}
          </div>
        )}
      </div>
      {fieldError && (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {fieldError}
        </p>
      )}
    </div>
  );
}

/* ── Form ─────────────────────────────────────────────────────── */

export function SupportTicketForm({
  onSubmit,
  isLoading = false,
  error,
  successMessage,
}: SupportTicketFormProps): ReactElement {
  const { t } = useTranslation('support');

  const schema = useMemo(() => createSupportTicketSchema(t), [t]);

  const categoryLabels = useMemo<Record<(typeof supportTicketCategories)[number], string>>(
    () => Object.fromEntries(
      supportTicketCategories.map((c) => [c, t(CATEGORY_KEYS[c])]),
    ) as Record<(typeof supportTicketCategories)[number], string>,
    [t],
  );

  const priorityLabels = useMemo<Record<(typeof supportTicketPriorities)[number], string>>(
    () => Object.fromEntries(
      supportTicketPriorities.map((p) => [p, t(PRIORITY_KEYS[p])]),
    ) as Record<(typeof supportTicketPriorities)[number], string>,
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<SupportTicketFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch is safe here
  const category = watch('category');
  const priority = watch('priority');

  const handleFormSubmit = async (data: SupportTicketFormData): Promise<void> => {
    try {
      await onSubmit({
        ...data,
        relatedTrackingNumber: data.relatedTrackingNumber?.trim() || undefined,
      });
      reset(defaultValues);
    } catch {
      // Keep values in place when the request fails.
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">{t('ticketForm.title')}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {t('ticketForm.subtitle')}
        </p>
      </div>

      {successMessage && (
        <AlertBanner tone="success" message={successMessage} className="mb-4" />
      )}

      {error && (
        <AlertBanner tone="error" message={error} className="mb-4" />
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          label={t('ticketForm.subjectLabel')}
          placeholder={t('ticketForm.subjectPlaceholder')}
          error={errors.subject?.message}
          {...register('subject')}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Dropdown
            id="support-category"
            label={t('ticketForm.categoryLabel')}
            value={category}
            options={supportTicketCategories}
            labels={categoryLabels}
            error={errors.category?.message}
            onChange={(v) => setValue('category', v, { shouldValidate: true })}
          />

          <Dropdown
            id="support-priority"
            label={t('ticketForm.priorityLabel')}
            value={priority}
            options={supportTicketPriorities}
            labels={priorityLabels}
            error={errors.priority?.message}
            onChange={(v) => setValue('priority', v, { shouldValidate: true })}
          />
        </div>

        <Input
          label={t('ticketForm.trackingNumberLabel')}
          placeholder={t('ticketForm.trackingNumberPlaceholder')}
          error={errors.relatedTrackingNumber?.message}
          {...register('relatedTrackingNumber')}
        />

        <div>
          <label htmlFor="support-description" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('ticketForm.messageLabel')}
          </label>
          <textarea
            id="support-description"
            rows={5}
            placeholder={t('ticketForm.messagePlaceholder')}
            className={`${fieldClassName} resize-y`}
            aria-invalid={errors.description ? 'true' : 'false'}
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" className="text-sm" size="md" isLoading={isLoading}>
            {t('ticketForm.submitButton')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
