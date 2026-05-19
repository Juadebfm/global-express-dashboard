import { z } from 'zod';

// Mirrors backend Zod for POST /public/newsletter/subscribe.
export const newsletterSubscribeSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

export type NewsletterSubscribeFormData = z.infer<typeof newsletterSubscribeSchema>;

// Mirrors backend Zod for POST /public/d2d/intake.
// Numeric form fields stay as strings (HTML inputs emit strings); the submit
// handler parses them before sending the API payload.
const positiveDecimalString = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Enter a positive number')
  .refine((v) => Number(v) >= 0, 'Enter a positive number');

export const publicD2dIntakeSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(5, 'Enter a valid phone number'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  goodsDescription: z
    .string()
    .min(3, 'Describe the goods in at least 3 characters')
    .max(5000, 'Description must be 5000 characters or fewer'),
  deliveryPhone: z.string().min(5, 'Enter a valid phone number'),
  deliveryAddressLine1: z.string().min(5, 'Enter the delivery address'),
  deliveryState: z.string().max(120).optional().or(z.literal('')),
  deliveryCity: z.string().max(120).optional().or(z.literal('')),
  deliveryPostalCode: z.string().max(40).optional().or(z.literal('')),
  deliveryLandmark: z.string().max(240).optional().or(z.literal('')),
  wantsAccount: z.boolean(),
  consentAcknowledgement: z
    .boolean()
    .refine((v) => v === true, 'Please acknowledge the consent to continue'),
  estimatedWeightKg: positiveDecimalString,
  estimatedCbm: positiveDecimalString,
});

export type PublicD2dIntakeFormData = z.infer<typeof publicD2dIntakeSchema>;
