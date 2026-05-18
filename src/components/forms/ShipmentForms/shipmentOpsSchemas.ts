import { z } from 'zod';

// Form-side numeric fields stay as strings (so HTML inputs can produce empty
// strings without NaN noise). Modal submit handlers parse them before
// forwarding to the API payload types in @/types/shipmentOps.types.ts.
const optionalDecimal = z
  .string()
  .max(40)
  .regex(/^$|^\d+(\.\d+)?$/, 'Enter a positive number')
  .optional()
  .or(z.literal(''));

const optionalInteger = z
  .string()
  .max(20)
  .regex(/^$|^\d+$/, 'Enter a positive integer')
  .optional()
  .or(z.literal(''));

// Mirrors backend Zod for POST /shipments/intake.
// Goods array must have at least one entry; supplierId required per line.
// shipmentPayer=SUPPLIER requires billingSupplierId.
export const shipmentIntakeGoodsSchema = z.object({
  supplierId: z.string().uuid('Each goods line needs a valid supplier id'),
  description: z.string().max(500).optional().or(z.literal('')),
  itemType: z.string().max(120).optional().or(z.literal('')),
  quantity: optionalInteger,
  lengthCm: optionalDecimal,
  widthCm: optionalDecimal,
  heightCm: optionalDecimal,
  weightKg: optionalDecimal,
  cbm: optionalDecimal,
  itemCostUsd: optionalDecimal,
  requiresExtraTruckMovement: z.boolean().optional(),
});

export const shipmentIntakeSchema = z
  .object({
    customerId: z.string().uuid('Enter a valid customer id'),
    mode: z.enum(['air', 'sea']),
    shipmentType: z.enum(['air', 'ocean', 'd2d']).optional().or(z.literal('')),
    shipmentPayer: z.enum(['USER', 'SUPPLIER']).optional(),
    billingSupplierId: z
      .string()
      .uuid('Billing supplier must be a valid id')
      .optional()
      .or(z.literal('')),
    goods: z.array(shipmentIntakeGoodsSchema).min(1, 'Add at least one goods line'),
  })
  .refine(
    (v) =>
      v.shipmentPayer !== 'SUPPLIER' ||
      (typeof v.billingSupplierId === 'string' && v.billingSupplierId.length > 0),
    {
      message: 'billingSupplierId is required when payer is SUPPLIER',
      path: ['billingSupplierId'],
    },
  );

export type ShipmentIntakeFormData = z.infer<typeof shipmentIntakeSchema>;

// Mirrors PUT /shipments/:id/measurements.
export const shipmentMeasurementSchema = z.object({
  checkpoint: z.enum(['SK_WAREHOUSE', 'AIRPORT', 'NIGERIA_OFFICE']),
  measuredWeightKg: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Enter a positive number')
    .refine((v) => Number(v) > 0, 'Weight must be greater than 0'),
  measuredCbm: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Enter a positive number')
    .refine((v) => Number(v) > 0, 'CBM must be greater than 0'),
  notes: z.string().max(1000, 'Note must be 1000 characters or fewer').optional().or(z.literal('')),
});

export type ShipmentMeasurementFormData = z.infer<typeof shipmentMeasurementSchema>;

// Mirrors PATCH /shipments/batches/:batchId/carrier-info.
// At least one field must be provided.
export const batchCarrierInfoSchema = z
  .object({
    carrierName: z.string().max(160).optional().or(z.literal('')),
    airlineTrackingNumber: z.string().max(120).optional().or(z.literal('')),
    oceanTrackingNumber: z.string().max(120).optional().or(z.literal('')),
    d2dTrackingNumber: z.string().max(120).optional().or(z.literal('')),
    voyageOrFlightNumber: z.string().max(120).optional().or(z.literal('')),
    estimatedDepartureAt: z.string().optional().or(z.literal('')),
    estimatedArrivalAt: z.string().optional().or(z.literal('')),
    notes: z.string().max(1000).optional().or(z.literal('')),
  })
  .refine(
    (v) => Object.values(v).some((x) => typeof x === 'string' && x.trim().length > 0),
    { message: 'Provide at least one field to update', path: ['carrierName'] },
  );

export type BatchCarrierInfoFormData = z.infer<typeof batchCarrierInfoSchema>;

// Mirrors PATCH /shipments/batches/:batchId/status.
export const batchStatusSchema = z.object({
  statusV2: z.string().min(1, 'Choose a status'),
});

export type BatchStatusFormData = z.infer<typeof batchStatusSchema>;

// Mirrors POST /shipments/batches/:batchId/move-to-next.
// supplierId XOR packageIds (exactly one must be supplied).
export const batchMoveToNextSchema = z
  .object({
    orderId: z.string().uuid('Enter a valid order id'),
    supplierId: z
      .string()
      .uuid('Supplier id must be a valid uuid')
      .optional()
      .or(z.literal('')),
    packageIdsText: z
      .string()
      .max(2000, 'Package id list is too long')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((v, ctx) => {
    const hasSupplierId = typeof v.supplierId === 'string' && v.supplierId.trim().length > 0;
    const hasPackageIds =
      typeof v.packageIdsText === 'string' && v.packageIdsText.trim().length > 0;
    if (hasSupplierId && hasPackageIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supplierId'],
        message: 'Provide either a supplier id or package ids, not both',
      });
    }
    if (!hasSupplierId && !hasPackageIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supplierId'],
        message: 'Provide a supplier id or at least one package id',
      });
    }
  });

export type BatchMoveToNextFormData = z.infer<typeof batchMoveToNextSchema>;
