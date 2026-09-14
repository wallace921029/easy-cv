import type { FastifyInstance } from "fastify";

export async function systemRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ ok: true }));
}
