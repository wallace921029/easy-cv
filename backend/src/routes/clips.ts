import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { requireUser, type AuthUser } from "../plugins/auth.js";
import * as clipsService from "../services/clips.js";
import { toApiClip } from "../services/clips.js";

const clipSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  groupId: z.string().nullable(),
  content: z.string(),
  pinnedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  activeAt: z.number().int(),
});

const listQuerySchema = z.object({
  groupId: z.string().min(1).optional(),
  cursor: z.string().optional(),
  q: z.string().optional(),
  pinned: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const listResponseSchema = z.object({
  items: z.array(clipSchema),
  nextCursor: z.string().nullable().optional(),
});

const nameSchema = z.string().max(64).nullable().optional();

const createBodySchema = z.object({ content: z.string(), name: nameSchema, groupId: z.string().min(1).nullable().optional() });
const createResultSchema = z.object({ clip: clipSchema, deduplicated: z.boolean() });

const patchBodySchema = z
  .object({
    groupId: z.string().min(1).nullable().optional(),
    content: z.string().optional(),
    pinned: z.boolean().optional(),
    name: nameSchema,
  })
  .refine(
    (o) => o.groupId !== undefined || o.content !== undefined || o.pinned !== undefined || o.name !== undefined,
  );

const idParamsSchema = z.object({ id: z.string().min(1) });
const clipResultSchema = z.object({ clip: clipSchema });

export async function clipsRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/clips",
    {
      preHandler: requireUser,
      schema: { querystring: listQuerySchema, response: { 200: listResponseSchema } },
    },
    async (request) => {
      const user = request.user as AuthUser;
      const { cursor: cursorRaw, q: qRaw, pinned, limit, groupId } = request.query;
      if (pinned === "true") {
        const items = clipsService.listPinnedClips(app.db, user.id, groupId ?? null).map(toApiClip);
        return { items };
      }
      const q = (qRaw ?? "").trim();
      if (q.length > 200) {
        throw new AppError(400, "VALIDATION_ERROR", "请求参数不正确");
      }
      const cursor = cursorRaw ? clipsService.decodeCursor(cursorRaw) : null;
      const { items, nextCursor } = clipsService.listClips(app.db, {
        userId: user.id,
        groupId: groupId ?? null,
        q: q === "" ? null : q,
        cursor,
        limit,
      });
      return { items: items.map(toApiClip), nextCursor };
    },
  );

  r.post(
    "/clips",
    {
      preHandler: requireUser,
      schema: {
        body: createBodySchema,
        response: { 200: createResultSchema, 201: createResultSchema },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthUser;
      const { clip, deduplicated } = clipsService.createClip(
        app.db,
        user.id,
        request.body.content,
        clipsService.normalizeClipName(request.body.name) ?? null,
        app.config.maxTextBytes,
        request.body.groupId ?? null,
      );
      return reply
        .status(deduplicated ? 200 : 201)
        .send({ clip: toApiClip(clip), deduplicated });
    },
  );

  r.patch(
    "/clips/:id",
    {
      preHandler: requireUser,
      schema: {
        params: idParamsSchema,
        body: patchBodySchema,
        response: { 200: clipResultSchema },
      },
    },
    async (request) => {
      const user = request.user as AuthUser;
      const clip = clipsService.updateClip(
        app.db,
        user.id,
        request.params.id,
        request.body,
        app.config.maxTextBytes,
      );
      return { clip: toApiClip(clip) };
    },
  );

  r.delete(
    "/clips/:id",
    { preHandler: requireUser, schema: { params: idParamsSchema } },
    async (request, reply) => {
      const user = request.user as AuthUser;
      clipsService.softDeleteClip(app.db, user.id, request.params.id);
      return reply.status(204).send();
    },
  );

  r.post(
    "/clips/:id/restore",
    {
      preHandler: requireUser,
      schema: { params: idParamsSchema, response: { 200: clipResultSchema } },
    },
    async (request) => {
      const user = request.user as AuthUser;
      const clip = clipsService.restoreClip(app.db, user.id, request.params.id);
      return { clip: toApiClip(clip) };
    },
  );
}
