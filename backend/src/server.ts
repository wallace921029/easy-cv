import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDb, runMigrations } from "./db/client.js";

const config = loadConfig();
const { db, sqlite } = createDb(config.dbPath);
runMigrations(db, config.migrationsDir);

const app = await buildApp({ config, db });

async function shutdown(): Promise<void> {
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
