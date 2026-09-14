import { and, eq, lt, ne } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Config } from "../config.js";
import type { Db, DbOrTx } from "../db/client.js";
import { sessions, users, type SessionRow, type UserRow } from "../db/schema.js";
import { randomToken, sha256 } from "../lib/crypto.js";

export const SESSION_COOKIE_NAME = "ecv_session";

const RENEW_INTERVAL_MS = 60 * 60 * 1000;

export function createSession(
  db: DbOrTx,
  userId: string,
  userAgent: string | null,
  sessionTtlMs: number,
): string {
  const token = randomToken();
  const now = Date.now();
  db.insert(sessions)
    .values({
      // Only the hash is stored, so a database leak does not expose usable tokens.
      id: sha256(token),
      userId,
      createdAt: now,
      expiresAt: now + sessionTtlMs,
      lastSeenAt: now,
      userAgent,
    })
    .run();
  return token;
}

export function findValidSession(
  db: DbOrTx,
  token: string,
  now: number = Date.now(),
): { session: SessionRow; user: UserRow } | null {
  const id = sha256(token);
  const row = db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .get();
  if (!row) {
    return null;
  }
  if (row.session.expiresAt <= now) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  return row;
}

// Sliding renewal: returns true when the row was bumped and the cookie should
// be re-issued. Writes at most once an hour per session.
export function touchSession(
  db: DbOrTx,
  sessionId: string,
  sessionTtlMs: number,
  now: number = Date.now(),
): boolean {
  const res = db
    .update(sessions)
    .set({ lastSeenAt: now, expiresAt: now + sessionTtlMs })
    .where(and(eq(sessions.id, sessionId), lt(sessions.lastSeenAt, now - RENEW_INTERVAL_MS)))
    .run();
  return res.changes > 0;
}

export function deleteSession(db: DbOrTx, token: string): void {
  db.delete(sessions).where(eq(sessions.id, sha256(token))).run();
}

export function deleteUserSessions(db: DbOrTx, userId: string, exceptSessionId?: string): void {
  const condition = exceptSessionId
    ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
    : eq(sessions.userId, userId);
  db.delete(sessions).where(condition).run();
}

export function deleteExpiredSessions(db: Db, now: number = Date.now()): number {
  const res = db.delete(sessions).where(lt(sessions.expiresAt, now)).run();
  return res.changes;
}

export function setSessionCookie(
  reply: FastifyReply,
  request: FastifyRequest,
  token: string,
  config: Config,
): void {
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    // request.protocol honors X-Forwarded-Proto when trustProxy is on.
    secure: request.protocol === "https",
    maxAge: Math.floor(config.sessionTtlMs / 1000),
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}
