import fs from "node:fs";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";

const NOT_FOUND_BODY = { error: { code: "NOT_FOUND", message: "资源不存在" } };

export async function registerWeb(app: FastifyInstance, config: Config): Promise<void> {
  const indexHtml = path.join(config.webDir, "index.html");
  const hasWeb = fs.existsSync(indexHtml);

  if (hasWeb) {
    await app.register(fastifyStatic, {
      root: config.webDir,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          // Hashed build artifacts are safe to cache forever.
          res.header("Cache-Control", "public, max-age=31536000, immutable");
        } else if (filePath.endsWith("index.html")) {
          res.header("Cache-Control", "no-cache");
        }
      },
    });
  }

  app.setNotFoundHandler((request, reply) => {
    // API routes must never fall through to the SPA page.
    if (request.url === "/api" || request.url.startsWith("/api/")) {
      return reply.status(404).send(NOT_FOUND_BODY);
    }
    if (request.method === "GET" && hasWeb) {
      return reply.sendFile("index.html");
    }
    return reply.status(404).send(NOT_FOUND_BODY);
  });
}
