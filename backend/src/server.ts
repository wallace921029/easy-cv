import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDb, runMigrations } from "./db/client.js";
import { startCleanupJob } from "./jobs/cleanup.js";
import { isInitialized } from "./services/users.js";

const config = loadConfig();
const { db, sqlite } = createDb(config.dbPath);
runMigrations(db, config.migrationsDir);

// Never allow an "open window" where the first visitor becomes the admin.
const initialized = isInitialized(db);
if (!initialized && (!config.adminInviteCode || config.adminInviteCode.length < 8)) {
  console.error("系统尚未初始化，请在 .env 中设置 ADMIN_INVITE_CODE（至少 8 位）后重启");
  process.exit(1);
}

const app = await buildApp({ config, db });

if (initialized && config.adminInviteCode) {
  app.log.info("系统已初始化，ADMIN_INVITE_CODE 已失效，可以从 .env 中删除");
}

const stopCleanup = startCleanupJob(db, app.log);

async function shutdown(): Promise<void> {
  stopCleanup();
  await app.close();
  sqlite.close();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

try {
  await app.listen({ host: "0.0.0.0", port: config.port });
} catch (err) {
  console.error(err);
  process.exit(1);
}
