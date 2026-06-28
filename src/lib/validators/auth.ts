import { z } from "zod";

const password = z.string().min(8, "Password must be at least 8 characters").max(128);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  institutionCode: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  institutionCode: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: password,
});

export type LoginInput = z.infer<typeof loginSchema>;
