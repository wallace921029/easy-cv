import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

// D7: this file lives in <repo>/backend/<src|dist>, so the repo root is two levels up.
const backendDir = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(backendDir, "..");

const envSchema = z.object({
  ADMIN_INVITE_CODE: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(8000),
  MAX_TEXT_SIZE_KB: z.coerce.number().int().min(1).default(1024),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  TRUST_PROXY: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => value === "true" || value === "1"),
  NODE_ENV: z.string().default("development"),
});

export type Config = {
  adminInviteCode: string | undefined;
  port: number;
  maxTextSizeKb: number;
  maxTextBytes: number;
  sessionTtlDays: number;
  sessionTtlMs: number;
  trustProxy: boolean;
  nodeEnv: string;
  dataDir: string;
  dbPath: string;
  webDir: string;
  migrationsDir: string;
};

export function createConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${detail}`);
  }
  const data = parsed.data;
  const dataDir = path.join(repoRoot, "data");
  return {
    adminInviteCode: data.ADMIN_INVITE_CODE,
    port: data.PORT,
    maxTextSizeKb: data.MAX_TEXT_SIZE_KB,
    maxTextBytes: data.MAX_TEXT_SIZE_KB * 1024,
    sessionTtlDays: data.SESSION_TTL_DAYS,
    sessionTtlMs: data.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    trustProxy: data.TRUST_PROXY,
    nodeEnv: data.NODE_ENV,
    dataDir,
    dbPath: path.join(dataDir, "easy-cv.db"),
    webDir: path.join(repoRoot, "dist"),
    migrationsDir: path.join(backendDir, "drizzle"),
  };
}

export function loadConfig(): Config {
  // D8: dotenv is not used; production gets variables from compose env_file.
  if (process.env.NODE_ENV !== "production") {
    const envPath = path.join(repoRoot, ".env");
    if (existsSync(envPath)) {
      process.loadEnvFile(envPath);
    }
  }
  return createConfig(process.env);
}
