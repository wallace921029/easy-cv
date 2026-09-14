import { z } from "zod";
import { strings } from "./strings";

export const usernameSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{3,32}$/, strings.validation.username);

export const passwordSchema = z
  .string()
  .min(8, strings.validation.passwordMin)
  .max(128, strings.validation.passwordMax);

export const inviteCodeInputSchema = z.string().min(1, strings.validation.inviteCodeRequired);

export const initCodeInputSchema = z.string().min(1, strings.validation.initCodeRequired);

// For schemas with password + confirmPassword fields; attach with .refine().
export function confirmPasswordRefinement(
  values: { password: string; confirmPassword?: string },
): boolean {
  return values.password === values.confirmPassword;
}

export const confirmPasswordIssue = {
  path: ["confirmPassword"],
  message: strings.validation.passwordMismatch,
} as const;
