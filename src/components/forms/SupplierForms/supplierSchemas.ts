import { z } from 'zod';

// Mirrors backend Zod for POST /users/me/suppliers (and /admin/clients/:id/suppliers):
// supplierId OR email is required; other fields are optional but apply when
// creating a brand-new supplier by invite.
export const addSupplierSchema = z
  .object({
    supplierId: z.string().uuid('Must be a valid supplier id').optional().or(z.literal('')),
    email: z.string().email('Enter a valid email').optional().or(z.literal('')),
    firstName: z.string().max(120).optional().or(z.literal('')),
    lastName: z.string().max(120).optional().or(z.literal('')),
    businessName: z.string().max(160).optional().or(z.literal('')),
    phone: z.string().max(40).optional().or(z.literal('')),
  })
  .refine(
    (v) => (v.supplierId && v.supplierId.length > 0) || (v.email && v.email.length > 0),
    { message: 'Provide either an existing supplier id or an email', path: ['email'] },
  );

export type AddSupplierFormData = z.infer<typeof addSupplierSchema>;

// Mirrors backend for POST /users/me/suppliers/:supplierId/update-request:
// at least one of firstName/lastName/businessName/phone/email; note up to 1000 chars.
export const supplierUpdateRequestSchema = z
  .object({
    firstName: z.string().max(120).optional().or(z.literal('')),
    lastName: z.string().max(120).optional().or(z.literal('')),
    businessName: z.string().max(160).optional().or(z.literal('')),
    phone: z.string().max(40).optional().or(z.literal('')),
    email: z.string().email('Enter a valid email').optional().or(z.literal('')),
    note: z.string().max(1000, 'Note must be 1000 characters or fewer').optional().or(z.literal('')),
  })
  .refine(
    (v) =>
      [v.firstName, v.lastName, v.businessName, v.phone, v.email]
        .some((s) => typeof s === 'string' && s.trim().length > 0),
    { message: 'Propose at least one change', path: ['firstName'] },
  );

export type SupplierUpdateRequestFormData = z.infer<typeof supplierUpdateRequestSchema>;

// Mirrors backend for PATCH /users/me/suppliers/validation-requests/:id.
export const supplierValidationDecisionSchema = z.object({
  isTrue: z.boolean(),
  note: z.string().max(1000).optional().or(z.literal('')),
});

export type SupplierValidationDecisionFormData = z.infer<
  typeof supplierValidationDecisionSchema
>;
