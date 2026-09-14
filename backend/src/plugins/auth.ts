import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "../lib/errors.js";
import {
  findValidSession,
  SESSION_COOKIE_NAME,
  setSessionCookie,
  touchSession,
} from "../services/sessions.js";

export type AuthUser = {
  id: string;
  username: string;
  role: "admin" | "user";
  status: "active" | "disabled";
};

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser | null;
    sessionId: string | null;
  }
}

export function registerAuth(app: FastifyInstance): void {
  app.decorateRequest("user", null);
  app.decorateRequest("sessionId", null);
  app.addHook("onRequest", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    if (!token) {
      return;
    }
    const found = findValidSession(app.db, token);
    if (!found) {
      return;
    }
    request.user = {
      id: found.user.id,
      username: found.user.username,
      role: found.user.role,
      status: found.user.status,
    };
    request.sessionId = found.session.id;
    if (touchSession(app.db, found.session.id, app.config.sessionTtlMs)) {
      setSessionCookie(reply, request, token, app.config);
    }
  });
}

export async function requireUser(request: FastifyRequest): Promise<void> {
  const user = request.user;
  // A disabled account is treated as logged out (its sessions were deleted
  // anyway; this is a backstop).
  if (!user || user.status !== "active") {
    throw new AppError(401, "UNAUTHORIZED", "未登录或登录已过期");
  }
}

export async function requireAdmin(request: FastifyRequest): Promise<void> {
  await requireUser(request);
  if (request.user?.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "没有权限执行此操作");
  }
}
