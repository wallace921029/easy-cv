import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.js";

export type Db = BetterSQLite3Database<typeof schema>;

export type DbHandle = {
  db: Db;
  sqlite: Database.Database;
};

function dataDirError(dir: string, cause: unknown): Error {
  return new Error(
    `数据目录不可写：${dir}。如果使用 Docker，请执行 \`sudo chown -R 1000:1000 ./data\``,
    { cause },
  );
}

export function createDb(dbPath: string): DbHandle {
  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
    } catch (err) {
      throw dataDirError(dir, err);
    }
  }
  let sqlite: Database.Database;
  try {
    sqlite = new Database(dbPath);
  } catch (err) {
    throw dataDirError(path.dirname(dbPath), err);
  }
  // D6: without foreign_keys the ON DELETE CASCADE rules silently do nothing.
  if (dbPath !== ":memory:") {
    sqlite.pragma("journal_mode = WAL");
  }
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return { db: drizzle(sqlite, { schema }), sqlite };
}

export function runMigrations(db: Db, migrationsDir: string): void {
  migrate(db, { migrationsFolder: migrationsDir });
}
