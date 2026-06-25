import { z } from 'zod';

export const newBookingSchema = z.object({
  description: z.string().min(3, 'Please describe what you are shipping'),
  shipmentType: z.enum(['air', 'sea']),
  weight: z.string().min(1, 'Weight is required'),
  declaredValue: z.string().min(1, 'Declared value is required'),
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientPhone: z.string().min(1, 'Recipient phone is required'),
  recipientEmail: z.string().email().optional().or(z.literal('')),
  hasSourcingSupplier: z.boolean(),
  sourcingSupplierType: z.enum(['saved', 'new']).optional(),
  sourcingSupplierId: z.string().uuid().optional(),
  sourcingSupplierName: z.string().optional(),
  sourcingSupplierPhone: z.string().optional(),
  sourcingSupplierEmail: z.string().email().optional().or(z.literal('')),
}).superRefine((val, ctx) => {
  if (!val.hasSourcingSupplier) return;
  if (val.sourcingSupplierType === 'saved' && !val.sourcingSupplierId) {
    ctx.addIssue({ code: 'custom', path: ['sourcingSupplierId'], message: 'Select a supplier' });
  }
  if (val.sourcingSupplierType === 'new' && !val.sourcingSupplierName) {
    ctx.addIssue({ code: 'custom', path: ['sourcingSupplierName'], message: 'Supplier name is required' });
  }
});

export type NewBookingFormValues = z.infer<typeof newBookingSchema>;
