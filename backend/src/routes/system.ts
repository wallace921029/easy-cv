import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getRegistrationSettings } from "../services/settings.js";
import { isInitialized } from "../services/users.js";

const statusSchema = z.object({
  initialized: z.boolean(),
  registrationOpen: z.boolean(),
  maxTextBytes: z.number().int(),
});

export async function systemRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ ok: true }));

  app.get("/system/status", { schema: { response: { 200: statusSchema } } }, async () => {
    const initialized = isInitialized(app.db);
    const settings = getRegistrationSettings(app.db);
    return {
      initialized,
      registrationOpen:
        initialized && settings.registrationEnabled && settings.inviteCode !== null,
      maxTextBytes: app.config.maxTextBytes,
    };
  });
}
