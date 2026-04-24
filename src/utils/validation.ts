import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, 'Username or email is required'),
  password: z.string().min(6, 'Password is required')
});

export const loanSchema = z.object({
  loanNo: z.string().min(3, 'Loan number is required')
});

export const kycSchema = z.object({
  address: z.string().min(5, 'Address is required'),
  // Accept 12 digits with optional spaces or hyphens e.g. "1212 1212 1212" or "121212121212"
  aadhaarNumber: z.string().regex(/^\d[\d\s-]{10}\d$/, 'Enter a valid 12-digit Aadhaar number')
});

export const isAadhaarValue = (value: string) => kycSchema.shape.aadhaarNumber.safeParse(value).success;

export type LoginFormValues = z.infer<typeof loginSchema>;
export type LoanFormValues = z.infer<typeof loanSchema>;
export type KYCFormValues = z.infer<typeof kycSchema>;
