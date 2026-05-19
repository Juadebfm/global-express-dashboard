import { z } from 'zod';

// Mirrors POST /public/gallery/anonymous/:trackingNumber/claim payload (proof
// uploads handled by the surrounding hook; this schema covers the form fields).
export const anonymousClaimSchema = z.object({
  itemId: z.string().uuid('Missing gallery item id'),
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(5, 'Enter a valid phone number'),
  city: z.string().max(120).optional().or(z.literal('')),
  country: z.string().max(120).optional().or(z.literal('')),
  message: z.string().max(2000, 'Message must be 2000 characters or fewer').optional().or(z.literal('')),
});

export type AnonymousClaimFormData = z.infer<typeof anonymousClaimSchema>;

// Mirrors POST /public/gallery/cars/:trackingNumber/purchase-attempt.
export const anonymousCarPurchaseSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(5, 'Enter a valid phone number'),
  city: z.string().max(120).optional().or(z.literal('')),
  country: z.string().max(120).optional().or(z.literal('')),
  message: z.string().max(2000).optional().or(z.literal('')),
});

export type AnonymousCarPurchaseFormData = z.infer<typeof anonymousCarPurchaseSchema>;

// Mirrors POST /gallery/items (staff). Validates the form, not the upload —
// previewImageUrl is captured separately after media presign returns the URL.
export const galleryItemSchema = z
  .object({
    itemType: z.enum(['anonymous_goods', 'car', 'advert']),
    title: z.string().min(2, 'Title must be at least 2 characters'),
    description: z.string().max(5000).optional().or(z.literal('')),
    previewImageUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
    ctaUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
    startsAt: z.string().optional().or(z.literal('')),
    endsAt: z.string().optional().or(z.literal('')),
    isPublished: z.boolean(),
    carPriceNgn: z
      .string()
      .max(20)
      .regex(/^$|^\d+(\.\d+)?$/, 'Enter a positive number')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((v, ctx) => {
    if (v.itemType === 'car') {
      const hasPrice = typeof v.carPriceNgn === 'string' && v.carPriceNgn.trim().length > 0;
      if (!hasPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['carPriceNgn'],
          message: 'Car listings need a price in NGN',
        });
      }
    }
  });

export type GalleryItemFormData = z.infer<typeof galleryItemSchema>;

// Mirrors PATCH /gallery/claims/:id/review.
export const galleryClaimReviewSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    note: z.string().max(2000).optional().or(z.literal('')),
    postApprovalAction: z.enum(['create_shipment', 'approve_only']).optional(),
    shipmentType: z.enum(['air', 'ocean', 'd2d']).optional(),
    d2dDispatchMode: z.enum(['air', 'sea']).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.decision !== 'approve') return;
    if (v.postApprovalAction === 'create_shipment') {
      if (!v.shipmentType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['shipmentType'],
          message: 'Choose a shipment type to create the shipment',
        });
      }
      if (v.shipmentType === 'd2d' && !v.d2dDispatchMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['d2dDispatchMode'],
          message: 'Choose a D2D dispatch mode (air or sea)',
        });
      }
    }
  });

export type GalleryClaimReviewFormData = z.infer<typeof galleryClaimReviewSchema>;
