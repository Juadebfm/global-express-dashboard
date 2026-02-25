import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertBanner, Button, Card, Input } from '@/components/ui';
import { supportTicketSchema, type SupportTicketFormData } from './SupportTicketForm.schema';
import type { SupportTicketFormProps } from './SupportTicketForm.types';

const defaultValues: SupportTicketFormData = {
  subject: '',
  category: 'shipment',
  priority: 'medium',
  relatedTrackingNumber: '',
  description: '',
};

const fieldClassName =
  'w-full rounded-lg border border-[#DDE5E9] bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500';

export function SupportTicketForm({
  onSubmit,
  isLoading = false,
  error,
  successMessage,
}: SupportTicketFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SupportTicketFormData>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues,
  });

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
        <h2 className="text-lg font-semibold text-gray-900">Create Support Ticket</h2>
        <p className="mt-1 text-sm text-gray-500">
          Submit an issue and it will be routed directly to the admin support queue.
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
          label="Subject"
          placeholder="Briefly describe your issue"
          error={errors.subject?.message}
          {...register('subject')}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="support-category" className="mb-1.5 block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="support-category"
              className={fieldClassName}
              aria-invalid={errors.category ? 'true' : 'false'}
              {...register('category')}
            >
              <option value="shipment">Shipment</option>
              <option value="billing">Billing</option>
              <option value="account">Account</option>
              <option value="technical">Technical</option>
              <option value="other">Other</option>
            </select>
            {errors.category && (
              <p className="mt-1.5 text-sm text-red-600" role="alert">
                {errors.category.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="support-priority" className="mb-1.5 block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              id="support-priority"
              className={fieldClassName}
              aria-invalid={errors.priority ? 'true' : 'false'}
              {...register('priority')}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            {errors.priority && (
              <p className="mt-1.5 text-sm text-red-600" role="alert">
                {errors.priority.message}
              </p>
            )}
          </div>
        </div>

        <Input
          label="Related Tracking Number (Optional)"
          placeholder="e.g. GX-1234567"
          error={errors.relatedTrackingNumber?.message}
          {...register('relatedTrackingNumber')}
        />

        <div>
          <label htmlFor="support-description" className="mb-1.5 block text-sm font-medium text-gray-700">
            Message
          </label>
          <textarea
            id="support-description"
            rows={5}
            placeholder="Provide details so our team can resolve this quickly."
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
            Submit Ticket
          </Button>
        </div>
      </form>
    </Card>
  );
}
