import type { FastifyInstance } from "fastify";
import { AppError } from "../lib/errors.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// CSRF defense on top of SameSite=Lax: when a write request carries an Origin
// header, its host must match the request Host. Requests without Origin (curl,
// same-origin navigations) are let through per spec.
export function registerOriginCheck(app: FastifyInstance): void {
  app.addHook("onRequest", async (request) => {
    if (!WRITE_METHODS.has(request.method)) {
      return;
    }
    const origin = request.headers.origin;
    if (origin === undefined) {
      return;
    }
    let originHost: string | null;
    try {
      originHost = new URL(origin).host;
    } catch {
      // Covers the literal "null" Origin sent by sandboxed/opaque contexts.
      originHost = null;
    }
    if (originHost === null || originHost !== request.host) {
      throw new AppError(403, "ORIGIN_MISMATCH", "请求来源不合法");
    }
  });
}
