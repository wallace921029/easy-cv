import { z } from "zod";

export const passwordSchema = z.string().min(8).max(128);

// For invite codes typed by the admin; stored in normalized form.
export const manualInviteCodeSchema = z.string().regex(/^[A-Z0-9]{6,32}$/);

export const emailSchema = z.email().max(254);
