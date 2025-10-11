import { z } from 'zod';

export const loginSchema = z.object({
  // email: z.string().min(1, 'Email is required').email('Invalid email address'),
  login: z.string().min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});
const baseRegistrationFields = {
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email is too long'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  confirmPassword: z.string(),
  
  firstName: z.string()
    .min(1, 'First name is required')
    .max(255, 'First name is too long'),
  
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(255, 'Last name is too long'),
};

// Employee registration schema with only employee-specific fields
// Notice how clean this is compared to the discriminated union approach
export const employeeRegistrationSchema = z.object({
  ...baseRegistrationFields,
  
  category: z.string()
    .min(1, 'Category is required')
    .max(255, 'Category is too long'),
  
  position: z.string()
    .refine(
      (val) => val === 'MERCHANDISING' || val === 'MASTERDATA',
      { message: 'Position must be either MERCHANDISING or MASTERDATA' }
    ),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Supplier registration schema with only supplier-specific fields
// This schema is completely independent from the employee schema
export const supplierRegistrationSchema = z.object({
  ...baseRegistrationFields,
  
  supplierCode: z.string()
    .min(1, 'Supplier code is required')
    .max(255, 'Supplier code is too long'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type EmployeeRegistrationInput = z.infer<typeof employeeRegistrationSchema>;
export type SupplierRegistrationInput = z.infer<typeof supplierRegistrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;