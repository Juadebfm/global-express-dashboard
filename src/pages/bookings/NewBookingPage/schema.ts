import { z } from 'zod';

/**
 * One schema for both audiences. A customer places an order for themselves; a
 * staff member places the same order on behalf of a client and can record the
 * extra operational details. The staff-only fields are optional here and the
 * page only renders them for internal roles — the backend remains the
 * authority on who may set them.
 */
export const newBookingSchema = z
  .object({
    description: z.string().min(3, 'Please describe what you are shipping'),
    shipmentType: z.enum(['air', 'sea', 'd2d']),
    weight: z.string().min(1, 'Weight is required'),
    declaredValue: z
      .string()
      .min(1, 'Declared value is required')
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
        message: 'Declared value must be a positive number',
      }),
    recipientName: z.string().min(1, 'Recipient name is required'),
    recipientPhone: z.string().min(1, 'Recipient phone is required'),
    recipientEmail: z.string().email().optional().or(z.literal('')),
    /** Door-to-door delivers to an address, so one is required for that type. */
    recipientAddress: z.string().optional(),
    hasSourcingSupplier: z.boolean(),
    sourcingSupplierType: z.enum(['directory', 'new']).optional(),
    sourcingSupplierId: z.string().uuid().optional(),
    sourcingSupplierName: z.string().optional(),
    sourcingSupplierPhone: z.string().optional(),
    sourcingSupplierEmail: z.string().email().optional().or(z.literal('')),

    // ── Staff only ──────────────────────────────────────────────────────────
    /** The client this order belongs to. Absent means "for myself". */
    senderId: z.string().uuid().optional(),
    pickupRepName: z.string().optional(),
    pickupRepPhone: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.shipmentType === 'd2d' && !val.recipientAddress?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['recipientAddress'],
        message: 'A delivery address is required for door-to-door',
      });
    }

    if (val.hasSourcingSupplier) {
      if (val.sourcingSupplierType === 'directory' && !val.sourcingSupplierId) {
        ctx.addIssue({ code: 'custom', path: ['sourcingSupplierId'], message: 'Select a supplier' });
      }
      if (val.sourcingSupplierType === 'new' && !val.sourcingSupplierName) {
        ctx.addIssue({
          code: 'custom',
          path: ['sourcingSupplierName'],
          message: 'Supplier name is required',
        });
      }
    }

    // A pickup representative needs a way to be reached.
    if (val.pickupRepName?.trim() && !val.pickupRepPhone?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['pickupRepPhone'],
        message: 'Add a phone number for the pickup representative',
      });
    }
  });

export type NewBookingFormValues = z.infer<typeof newBookingSchema>;
