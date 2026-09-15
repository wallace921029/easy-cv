import { z } from "zod";
import { strings } from "./strings";

export const getUsernameSchema = () =>
  z.string().regex(/^[A-Za-z0-9_-]{3,32}$/, strings.validation.username);

export const getPasswordSchema = () =>
  z
    .string()
    .min(8, strings.validation.passwordMin)
    .max(128, strings.validation.passwordMax);

export const getInviteCodeInputSchema = () =>
  z.string().min(1, strings.validation.inviteCodeRequired);

export const getInitCodeInputSchema = () =>
  z.string().min(1, strings.validation.initCodeRequired);

export const getConfirmPasswordIssue = () => ({
  path: ["confirmPassword"],
  message: strings.validation.passwordMismatch,
});

export const usernameSchema = getUsernameSchema();
export const passwordSchema = getPasswordSchema();
export const inviteCodeInputSchema = getInviteCodeInputSchema();
export const initCodeInputSchema = getInitCodeInputSchema();

// For schemas with password + confirmPassword fields; attach with .refine().
export function confirmPasswordRefinement(
  values: { password: string; confirmPassword?: string },
): boolean {
  return values.password === values.confirmPassword;
}

export const confirmPasswordIssue = {
  path: ["confirmPassword"],
  get message() {
    return strings.validation.passwordMismatch;
  },
};
