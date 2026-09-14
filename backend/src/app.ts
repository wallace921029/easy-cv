import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import type { Config } from "./config.js";
import type { Db } from "./db/client.js";
import { AppError } from "./lib/errors.js";
import { registerAuth } from "./plugins/auth.js";
import { registerOriginCheck } from "./plugins/origin-check.js";
import { registerWeb } from "./plugins/web.js";
import { authRoutes } from "./routes/auth.js";
import { clipsRoutes } from "./routes/clips.js";
import { systemRoutes } from "./routes/system.js";

export type RateLimitConfig = {
  max: number;
  timeWindow: number;
};

export type BuildAppOptions = {
  config: Config;
  db: Db;
  // D18: overridable so tests can relax the limit; production uses the default.
  rateLimit?: RateLimitConfig;
  logger?: boolean;
};

declare module "fastify" {
  interface FastifyInstance {
    config: Config;
    db: Db;
    authRateLimit: RateLimitConfig;
  }
}

const DEFAULT_AUTH_RATE_LIMIT: RateLimitConfig = { max: 10, timeWindow: 15 * 60 * 1000 };

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { config, db } = options;
  const app = Fastify({
    trustProxy: config.trustProxy,
    // JSON escaping inflates the payload, so the hard limit lives in the
    // content byte-size validation instead of the body parser.
    bodyLimit: config.maxTextBytes * 2 + 16 * 1024,
    logger: (options.logger ?? config.nodeEnv === "production") ? { level: "info" } : false,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate("config", config);
  app.decorate("db", db);
  app.decorate("authRateLimit", options.rateLimit ?? DEFAULT_AUTH_RATE_LIMIT);

  app.setErrorHandler((err: FastifyError, request, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.status).send({ error: { code: err.code, message: err.message } });
    }
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply
        .status(400)
        .send({ error: { code: "VALIDATION_ERROR", message: "请求参数不正确" } });
    }
    if (err.statusCode === 429) {
      return reply
        .status(429)
        .send({ error: { code: "RATE_LIMITED", message: "操作太频繁，请稍后再试" } });
    }
    if (err.statusCode === 413) {
      return reply
        .status(413)
        .send({ error: { code: "TEXT_TOO_LARGE", message: "文本超过大小上限" } });
    }
    if (err.statusCode === 400) {
      return reply
        .status(400)
        .send({ error: { code: "VALIDATION_ERROR", message: "请求参数不正确" } });
    }
    request.log.error(err);
    return reply
      .status(500)
      .send({ error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } });
  });

  await app.register(fastifyHelmet, {
    // D14: HSTS belongs to the Nginx layer; forcing it here would break plain
    // HTTP access by IP. Same for CSP's upgrade-insecure-requests, which is
    // why the directives below are helmet's defaults minus that entry.
    strictTransportSecurity: false,
    contentSecurityPolicy: {
      // useDefaults would re-add upgrade-insecure-requests.
      useDefaults: false,
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "font-src": ["'self'", "https:", "data:"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'self'"],
        "img-src": ["'self'", "data:"],
        "object-src": ["'none'"],
        "script-src": ["'self'"],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'", "https:", "'unsafe-inline'"],
      },
    },
  });
  await app.register(fastifyCookie);
  await app.register(fastifyRateLimit, { global: false });
  registerOriginCheck(app);
  registerAuth(app);

  await app.register(
    async (api) => {
      await api.register(systemRoutes);
      await api.register(authRoutes);
      await api.register(clipsRoutes);
    },
    { prefix: "/api" },
  );

  await registerWeb(app, config);
  return app;
}
