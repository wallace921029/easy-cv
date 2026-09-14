import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { DbOrTx } from "../db/client.js";
import { users, type UserRow } from "../db/schema.js";

export function isInitialized(db: DbOrTx): boolean {
  const row = db.select({ count: sql<number>`count(*)` }).from(users).get();
  return (row?.count ?? 0) > 0;
}

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string" &&
    (err as { code: string }).code.startsWith("SQLITE_CONSTRAINT")
  );
}

export function findByUsername(db: DbOrTx, username: string): UserRow | null {
  const row = db
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
    .get();
  return row ?? null;
}

export function findById(db: DbOrTx, id: string): UserRow | null {
  const row = db.select().from(users).where(eq(users.id, id)).get();
  return row ?? null;
}

export function createUser(
  db: DbOrTx,
  data: { username: string; passwordHash: string; role: "admin" | "user" },
): UserRow {
  const row: UserRow = {
    id: nanoid(),
    username: data.username,
    passwordHash: data.passwordHash,
    role: data.role,
    status: "active",
    createdAt: Date.now(),
    lastLoginAt: null,
  };
  db.insert(users).values(row).run();
  return row;
}

export function touchLastLogin(db: DbOrTx, userId: string): void {
  db.update(users).set({ lastLoginAt: Date.now() }).where(eq(users.id, userId)).run();
}

export function updatePassword(db: DbOrTx, userId: string, passwordHash: string): void {
  db.update(users).set({ passwordHash }).where(eq(users.id, userId)).run();
}
