import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { normalizeCode } from "../lib/codes.js";
import { AppError } from "../lib/errors.js";
import { hashPassword } from "../lib/password.js";
import { manualInviteCodeSchema, passwordSchema } from "../lib/validation.js";
import { requireAdmin } from "../plugins/auth.js";
import {
  getRegistrationSettings,
  regenerateInviteCode,
  updateRegistrationSettings,
} from "../services/settings.js";
import { deleteUserSessions } from "../services/sessions.js";
import * as usersService from "../services/users.js";

const adminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(["admin", "user"]),
  status: z.enum(["active", "disabled"]),
  clipCount: z.number().int(),
  createdAt: z.number().int(),
  lastLoginAt: z.number().int().nullable(),
});

const registrationSettingsSchema = z.object({
  registrationEnabled: z.boolean(),
  inviteCode: z.string().nullable(),
});

const idParamsSchema = z.object({ id: z.string().min(1) });

const patchUserBodySchema = z.object({ status: z.enum(["active", "disabled"]) });
const resetPasswordBodySchema = z.object({ password: passwordSchema });
const patchSettingsBodySchema = z
  .object({
    registrationEnabled: z.boolean().optional(),
    inviteCode: z.string().optional(),
  })
  .refine((o) => o.registrationEnabled !== undefined || o.inviteCode !== undefined);

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  const findTargetUser = (id: string) => {
    const target = usersService.findById(app.db, id);
    if (!target) {
      throw new AppError(404, "NOT_FOUND", "用户不存在");
    }
    if (target.role === "admin") {
      throw new AppError(403, "CANNOT_MODIFY_ADMIN", "不能对管理员账户执行此操作");
    }
    return target;
  };

  r.get(
    "/admin/users",
    {
      preHandler: requireAdmin,
      schema: { response: { 200: z.object({ items: z.array(adminUserSchema) }) } },
    },
    async () => ({ items: usersService.listAdminUsers(app.db) }),
  );

  r.patch(
    "/admin/users/:id",
    {
      preHandler: requireAdmin,
      schema: {
        params: idParamsSchema,
        body: patchUserBodySchema,
        response: { 200: z.object({ user: adminUserSchema }) },
      },
    },
    async (request) => {
      const target = findTargetUser(request.params.id);
      const { status } = request.body;
      if (status !== target.status) {
        usersService.setUserStatus(app.db, target.id, status);
        if (status === "disabled") {
          // Kick the user out of every device immediately.
          deleteUserSessions(app.db, target.id);
        }
      }
      const updated = usersService.getAdminUser(app.db, target.id);
      if (!updated) {
        throw new AppError(404, "NOT_FOUND", "用户不存在");
      }
      return { user: updated };
    },
  );

  r.put(
    "/admin/users/:id/password",
    {
      preHandler: requireAdmin,
      schema: { params: idParamsSchema, body: resetPasswordBodySchema },
    },
    async (request, reply) => {
      const target = findTargetUser(request.params.id);
      const passwordHash = await hashPassword(request.body.password);
      usersService.updatePassword(app.db, target.id, passwordHash);
      deleteUserSessions(app.db, target.id);
      return reply.status(204).send();
    },
  );

  r.delete(
    "/admin/users/:id",
    { preHandler: requireAdmin, schema: { params: idParamsSchema } },
    async (request, reply) => {
      const target = findTargetUser(request.params.id);
      usersService.deleteUserById(app.db, target.id);
      return reply.status(204).send();
    },
  );

  r.get(
    "/admin/settings",
    { preHandler: requireAdmin, schema: { response: { 200: registrationSettingsSchema } } },
    async () => getRegistrationSettings(app.db),
  );

  r.patch(
    "/admin/settings",
    {
      preHandler: requireAdmin,
      schema: { body: patchSettingsBodySchema, response: { 200: registrationSettingsSchema } },
    },
    async (request) => {
      const { registrationEnabled, inviteCode } = request.body;
      let normalizedCode: string | undefined;
      if (inviteCode !== undefined) {
        normalizedCode = normalizeCode(inviteCode);
        if (!manualInviteCodeSchema.safeParse(normalizedCode).success) {
          throw new AppError(400, "VALIDATION_ERROR", "邀请码需为 6–32 位字母或数字");
        }
      }
      return updateRegistrationSettings(app.db, {
        registrationEnabled,
        inviteCode: normalizedCode,
      });
    },
  );

  r.post(
    "/admin/settings/invite-code",
    { preHandler: requireAdmin, schema: { response: { 200: registrationSettingsSchema } } },
    async () => regenerateInviteCode(app.db),
  );
}
