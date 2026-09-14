import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { Db, DbOrTx } from "../db/client.js";
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

export type AdminUserRow = {
  id: string;
  username: string;
  role: "admin" | "user";
  status: "active" | "disabled";
  clipCount: number;
  createdAt: number;
  lastLoginAt: number | null;
};

// clipCount only counts clips that are not soft-deleted, and never exposes
// any clip content to the admin. The subquery uses literal qualified names:
// drizzle interpolation would drop the table prefixes and mis-correlate.
const adminUserSelection = {
  id: users.id,
  username: users.username,
  role: users.role,
  status: users.status,
  createdAt: users.createdAt,
  lastLoginAt: users.lastLoginAt,
  clipCount: sql<number>`(select count(*) from clips where clips.user_id = users.id and clips.deleted_at is null)`,
} as const;

function sortAdminUsers(rows: AdminUserRow[]): AdminUserRow[] {
  // The (single) admin comes first, everyone else by registration time.
  return rows.sort((a, b) => {
    if (a.role !== b.role) {
      return a.role === "admin" ? -1 : 1;
    }
    return a.createdAt - b.createdAt;
  });
}

export function listAdminUsers(db: DbOrTx): AdminUserRow[] {
  const rows = db.select(adminUserSelection).from(users).all();
  return sortAdminUsers(rows);
}

export function getAdminUser(db: DbOrTx, id: string): AdminUserRow | null {
  const row = db.select(adminUserSelection).from(users).where(eq(users.id, id)).get();
  return row ?? null;
}

export function setUserStatus(db: DbOrTx, userId: string, status: "active" | "disabled"): void {
  db.update(users).set({ status }).where(eq(users.id, userId)).run();
}

export function deleteUserById(db: Db, userId: string): void {
  // Cascades to sessions and clips via ON DELETE CASCADE (needs the
  // foreign_keys pragma from db/client).
  db.transaction((tx) => {
    tx.delete(users).where(eq(users.id, userId)).run();
  });
}
