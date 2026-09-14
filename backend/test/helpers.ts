import type { FastifyInstance, InjectOptions } from "fastify";
import type { LightMyRequestResponse } from "fastify";
import { buildApp, type RateLimitConfig } from "../src/app.js";
import { createConfig, type Config } from "../src/config.js";
import { createDb, runMigrations, type Db } from "../src/db/client.js";

export const TEST_INIT_CODE = "test-init-code-123";

export type TestContext = {
  app: FastifyInstance;
  db: Db;
  config: Config;
  close: () => Promise<void>;
};

export async function createTestApp(overrides?: {
  env?: NodeJS.ProcessEnv;
  rateLimit?: RateLimitConfig;
}): Promise<TestContext> {
  const config = createConfig({
    ADMIN_INVITE_CODE: TEST_INIT_CODE,
    NODE_ENV: "test",
    ...overrides?.env,
  });
  const { db, sqlite } = createDb(":memory:");
  runMigrations(db, config.migrationsDir);
  const app = await buildApp({
    config,
    db,
    logger: false,
    rateLimit: overrides?.rateLimit ?? { max: 100_000, timeWindow: 60_000 },
  });
  return {
    app,
    db,
    config,
    close: async () => {
      await app.close();
      sqlite.close();
    },
  };
}

export function sessionCookie(res: LightMyRequestResponse): string {
  const cookie = res.cookies.find((c) => c.name === "ecv_session");
  if (!cookie) {
    throw new Error("response does not contain an ecv_session cookie");
  }
  return `ecv_session=${cookie.value}`;
}

export async function setupAdmin(
  app: FastifyInstance,
  initCode: string = TEST_INIT_CODE,
  username = "admin",
  password = "admin-password",
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: "POST",
    url: "/api/setup",
    payload: { username, password, initCode },
  });
}

export async function registerUser(
  app: FastifyInstance,
  username: string,
  password: string,
  inviteCode: string,
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: { username, password, inviteCode },
  });
}

export async function login(
  app: FastifyInstance,
  username: string,
  password: string,
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password },
  });
}

export function authed(app: FastifyInstance, cookie: string) {
  return (opts: InjectOptions): Promise<LightMyRequestResponse> =>
    app.inject({ ...opts, headers: { cookie, ...opts.headers } });
}
