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

export const supportTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, 'Subject must be at least 5 characters')
    .max(120, 'Subject must be 120 characters or less'),
  category: z.enum(supportTicketCategories, 'Please select a valid category'),
  priority: z.enum(supportTicketPriorities, 'Please select a valid priority'),
  relatedTrackingNumber: z
    .string()
    .trim()
    .max(50, 'Tracking number must be 50 characters or less')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .min(10, 'Please provide at least 10 characters')
    .max(2000, 'Message must be 2000 characters or less'),
});

export type SupportTicketFormData = z.infer<typeof supportTicketSchema>;
