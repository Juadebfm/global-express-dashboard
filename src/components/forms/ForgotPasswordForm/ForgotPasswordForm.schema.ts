import { z } from 'zod';

// Step 1: Email validation
export const emailStepSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type EmailStepData = z.infer<typeof emailStepSchema>;

// Step 2: OTP validation
export const otpStepSchema = z.object({
  otp: z
    .string()
    .length(4, 'Please enter the 4-digit code')
    .regex(/^\d{4}$/, 'Code must contain only numbers'),
});

export type OtpStepData = z.infer<typeof otpStepSchema>;

// Step 3: New password validation
export const newPasswordStepSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type NewPasswordStepData = z.infer<typeof newPasswordStepSchema>;

// Legacy export for backwards compatibility
export const forgotPasswordSchema = emailStepSchema;
export type ForgotPasswordFormData = EmailStepData;
