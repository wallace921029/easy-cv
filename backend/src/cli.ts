import crypto from "node:crypto";
import { loadConfig } from "./config.js";
import { createDb, runMigrations } from "./db/client.js";
import { hashPassword } from "./lib/password.js";
import { deleteUserSessions } from "./services/sessions.js";
import { findByUsername, updatePassword } from "./services/users.js";

const USAGE = "用法：node backend/dist/cli.js reset-password <username>";

const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generatePassword(length: number): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)];
  }
  return password;
}

async function main(): Promise<void> {
  const [command, username] = process.argv.slice(2);
  if (command !== "reset-password" || !username) {
    console.error(USAGE);
    process.exit(1);
  }

  const config = loadConfig();
  const { db, sqlite } = createDb(config.dbPath);
  try {
    runMigrations(db, config.migrationsDir);
    const user = findByUsername(db, username);
    if (!user) {
      console.error(`用户不存在：${username}`);
      console.error(USAGE);
      process.exit(1);
    }
    const password = generatePassword(16);
    updatePassword(db, user.id, await hashPassword(password));
    deleteUserSessions(db, user.id);
    console.log(`用户 ${user.username} 的新密码：${password}`);
    console.log("请立即告知用户；此密码不会再次显示，该用户所有设备的登录已失效。");
  } finally {
    sqlite.close();
  }
}

await main();
