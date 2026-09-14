import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { normalizeCode } from "../lib/codes.js";
import { safeEqual } from "../lib/crypto.js";
import { AppError } from "../lib/errors.js";
import { DUMMY_HASH, hashPassword, verifyPassword } from "../lib/password.js";
import { passwordSchema, usernameSchema } from "../lib/validation.js";
import { requireUser, type AuthUser } from "../plugins/auth.js";
import { getRegistrationSettings } from "../services/settings.js";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  deleteUserSessions,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from "../services/sessions.js";
import * as usersService from "../services/users.js";

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(["admin", "user"]),
});
const userResultSchema = z.object({ user: userSchema });

const setupBodySchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  initCode: z.string().min(1),
});
const registerBodySchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  inviteCode: z.string().min(1),
});
const loginBodySchema = z.object({
  username: usernameSchema,
  password: z.string().min(1),
});
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

function toApiUser(row: AuthUser): z.infer<typeof userSchema> {
  return { id: row.id, username: row.username, role: row.role };
}

function startSession(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  userId: string,
): void {
  const token = createSession(
    app.db,
    userId,
    request.headers["user-agent"] ?? null,
    app.config.sessionTtlMs,
  );
  setSessionCookie(reply, request, token, app.config);
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const rateLimit = app.authRateLimit;

  r.post(
    "/setup",
    {
      schema: { body: setupBodySchema, response: { 201: userResultSchema } },
      config: { rateLimit },
    },
    async (request, reply) => {
      const { db, config } = app;
      if (usersService.isInitialized(db)) {
        throw new AppError(409, "ALREADY_INITIALIZED", "系统已完成初始化");
      }
      const { username, password, initCode } = request.body;
      const expected = normalizeCode(config.adminInviteCode ?? "");
      if (expected === "" || !safeEqual(normalizeCode(initCode), expected)) {
        throw new AppError(403, "INIT_CODE_INVALID", "初始化码错误");
      }
      // Hash outside the transaction: argon2 is async, the better-sqlite3
      // transaction is sync. The emptiness check runs again inside so only the
      // first of several concurrent requests can win.
      const passwordHash = await hashPassword(password);
      const user = db.transaction((tx) => {
        if (usersService.isInitialized(tx)) {
          throw new AppError(409, "ALREADY_INITIALIZED", "系统已完成初始化");
        }
        return usersService.createUser(tx, { username, passwordHash, role: "admin" });
      });
      usersService.touchLastLogin(db, user.id);
      startSession(app, request, reply, user.id);
      return reply.status(201).send({ user: toApiUser(user) });
    },
  );

  r.post(
    "/auth/register",
    {
      schema: { body: registerBodySchema, response: { 201: userResultSchema } },
      config: { rateLimit },
    },
    async (request, reply) => {
      const { db } = app;
      if (!usersService.isInitialized(db)) {
        throw new AppError(403, "REGISTRATION_CLOSED", "当前未开放注册，请联系管理员");
      }
      const settings = getRegistrationSettings(db);
      if (!settings.registrationEnabled || settings.inviteCode === null) {
        throw new AppError(403, "REGISTRATION_CLOSED", "当前未开放注册，请联系管理员");
      }
      const { username, password, inviteCode } = request.body;
      if (!safeEqual(normalizeCode(inviteCode), settings.inviteCode)) {
        throw new AppError(403, "INVITE_CODE_INVALID", "邀请码无效");
      }
      const passwordHash = await hashPassword(password);
      let user;
      try {
        user = usersService.createUser(db, { username, passwordHash, role: "user" });
      } catch (err) {
        if (usersService.isUniqueViolation(err)) {
          throw new AppError(409, "USERNAME_TAKEN", "用户名已存在");
        }
        throw err;
      }
      usersService.touchLastLogin(db, user.id);
      startSession(app, request, reply, user.id);
      return reply.status(201).send({ user: toApiUser(user) });
    },
  );

  r.post(
    "/auth/login",
    {
      schema: { body: loginBodySchema, response: { 200: userResultSchema } },
      config: { rateLimit },
    },
    async (request, reply) => {
      const { username, password } = request.body;
      const user = usersService.findByUsername(app.db, username);
      if (!user) {
        // Equalize timing with the "password wrong" path.
        await verifyPassword(DUMMY_HASH, password);
        throw new AppError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
      }
      if (!(await verifyPassword(user.passwordHash, password))) {
        throw new AppError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
      }
      // Revealed only after the password checks out.
      if (user.status !== "active") {
        throw new AppError(403, "ACCOUNT_DISABLED", "账户已被停用，请联系管理员");
      }
      usersService.touchLastLogin(app.db, user.id);
      startSession(app, request, reply, user.id);
      return { user: toApiUser(user) };
    },
  );

  r.post("/auth/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    if (token) {
      deleteSession(app.db, token);
    }
    clearSessionCookie(reply);
    return reply.status(204).send();
  });

  r.get(
    "/auth/me",
    { preHandler: requireUser, schema: { response: { 200: userResultSchema } } },
    async (request) => ({ user: toApiUser(request.user as AuthUser) }),
  );

  r.put(
    "/auth/password",
    { preHandler: requireUser, schema: { body: passwordChangeSchema }, config: { rateLimit } },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body;
      const sessionId = request.sessionId as string;
      const user = usersService.findById(app.db, (request.user as AuthUser).id);
      if (!user) {
        throw new AppError(401, "UNAUTHORIZED", "未登录或登录已过期");
      }
      if (!(await verifyPassword(user.passwordHash, currentPassword))) {
        throw new AppError(400, "WRONG_PASSWORD", "当前密码错误");
      }
      const passwordHash = await hashPassword(newPassword);
      usersService.updatePassword(app.db, user.id, passwordHash);
      // Keep the current session, kick every other device.
      deleteUserSessions(app.db, user.id, sessionId);
      return reply.status(204).send();
    },
  );
}
