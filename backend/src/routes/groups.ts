import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { nanoid } from "nanoid";
import { z } from "zod";
import { groups } from "../db/schema.js";
import { AppError } from "../lib/errors.js";
import { requireUser, type AuthUser } from "../plugins/auth.js";

export async function groupsRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const params = z.object({ id: z.string().min(1) });
  const body = z.object({ name: z.string().trim().min(1).max(64) });
  r.get("/groups", { preHandler: requireUser }, async (request) => ({
    items: app.db.select({ id: groups.id, name: groups.name }).from(groups)
      .where(eq(groups.userId, (request.user as AuthUser).id)).orderBy(groups.createdAt, groups.id).all(),
  }));
  r.post("/groups", { preHandler: requireUser, schema: { body } }, async (request, reply) => {
    const group = { id: nanoid(), userId: (request.user as AuthUser).id, name: request.body.name, createdAt: Date.now() };
    app.db.insert(groups).values(group).run();
    return reply.status(201).send({ group: { id: group.id, name: group.name } });
  });
  r.patch("/groups/:id", { preHandler: requireUser, schema: { params, body } }, async (request) => {
    const result = app.db.update(groups).set({ name: request.body.name }).where(and(eq(groups.id, request.params.id), eq(groups.userId, (request.user as AuthUser).id))).run();
    if (!result.changes) throw new AppError(404, "NOT_FOUND", "分组不存在");
    return { group: { id: request.params.id, name: request.body.name } };
  });
  r.delete("/groups/:id", { preHandler: requireUser, schema: { params } }, async (request, reply) => {
    const result = app.db.delete(groups).where(and(eq(groups.id, request.params.id), eq(groups.userId, (request.user as AuthUser).id))).run();
    if (!result.changes) throw new AppError(404, "NOT_FOUND", "分组不存在");
    return reply.status(204).send();
  });
}
