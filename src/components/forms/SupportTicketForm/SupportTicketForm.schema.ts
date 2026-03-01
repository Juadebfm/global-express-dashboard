import { z } from 'zod';

export const supportTicketCategories = [
  'shipment_inquiry',
  'payment_issue',
  'damaged_goods',
  'document_request',
  'account_issue',
  'general',
] as const;

export const supportTicketPriorities = ['low', 'medium', 'high'] as const;

export type TFn = (key: string) => string;

export function createSupportTicketSchema(t: TFn) {
  return z.object({
    subject: z
      .string()
      .trim()
      .min(5, t('ticketForm.validation.subjectMin'))
      .max(120, t('ticketForm.validation.subjectMax')),
    category: z.enum(supportTicketCategories, { message: t('ticketForm.validation.categoryRequired') }),
    priority: z.enum(supportTicketPriorities, { message: t('ticketForm.validation.priorityRequired') }),
    relatedTrackingNumber: z
      .string()
      .trim()
      .max(50, t('ticketForm.validation.trackingNumberMax'))
      .optional()
      .or(z.literal('')),
    description: z
      .string()
      .trim()
      .min(10, t('ticketForm.validation.descriptionMin'))
      .max(2000, t('ticketForm.validation.descriptionMax')),
  });
}

/** Keep a static schema for type inference */
export const supportTicketSchema = createSupportTicketSchema((k) => k);

export type SupportTicketFormData = z.infer<typeof supportTicketSchema>;
