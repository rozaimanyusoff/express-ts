/**
 * Zod schemas for Auth / User registration endpoints.
 */
import { z } from './index';

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export const RegisterSchema = z.object({
   about: z.string().trim().optional().default(''),
   contact: z.string().trim().optional().default(''),
   email: z.string().trim().email('Invalid email address'),
   name: z.string().trim().min(1, 'Name is required'),
   userType: z.number().int().optional(),
   username: z.string().trim().min(3, 'Username must be at least 3 characters'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export const LoginSchema = z.object({
   emailOrUsername: z.string().trim().min(1, 'Email or username is required'),
   password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password  (request a reset)
// ---------------------------------------------------------------------------
export const ResetPasswordRequestSchema = z.object({
   email: z.string().trim().email('Invalid email address'),
});

export type ResetPasswordRequestInput = z.infer<typeof ResetPasswordRequestSchema>;
