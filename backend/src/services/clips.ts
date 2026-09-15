import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { DbOrTx } from "../db/client.js";
import { clips, type ClipRow } from "../db/schema.js";
import { sha256 } from "../lib/crypto.js";
import { AppError } from "../lib/errors.js";

export type ApiClip = {
  id: string;
  name: string | null;
  content: string;
  pinnedAt: number | null;
  createdAt: number;
  updatedAt: number;
  activeAt: number;
};

// Single place mapping a DB row to the API shape; user_id / content_hash /
// deleted_at must never leak to clients.
export function toApiClip(row: ClipRow): ApiClip {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    pinnedAt: row.pinnedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    activeAt: row.activeAt,
  };
}

export function assertValidContent(content: string, maxTextBytes: number): void {
  if (!/\S/.test(content)) {
    throw new AppError(400, "EMPTY_CONTENT", "内容不能为空");
  }
  if (Buffer.byteLength(content, "utf8") > maxTextBytes) {
    throw new AppError(413, "TEXT_TOO_LARGE", "文本超过大小上限");
  }
}

// Names are trimmed; a blank name means "no name". Renaming never counts as a
// content edit, so it must not touch updated_at.
export function normalizeClipName(name: string | null | undefined): string | null | undefined {
  if (name === undefined) {
    return undefined;
  }
  if (name === null) {
    return null;
  }
  const trimmed = name.trim();
  return trimmed === "" ? null : trimmed;
}

export function createClip(
  db: DbOrTx,
  userId: string,
  content: string,
  name: string | null,
  maxTextBytes: number,
): { clip: ClipRow; deduplicated: boolean } {
  assertValidContent(content, maxTextBytes);
  const contentHash = sha256(content);
  const existing = db
    .select()
    .from(clips)
    .where(
      and(
        eq(clips.userId, userId),
        eq(clips.contentHash, contentHash),
        isNull(clips.deletedAt),
      ),
    )
    .get();
  const now = Date.now();
  if (existing) {
    // A dedup hit never renames the existing clip: the name submitted with the
    // duplicate paste is intentionally dropped.
    if (existing.pinnedAt === null) {
      db.update(clips).set({ activeAt: now }).where(eq(clips.id, existing.id)).run();
      return { clip: { ...existing, activeAt: now }, deduplicated: true };
    }
    return { clip: existing, deduplicated: true };
  }
  const row: ClipRow = {
    id: nanoid(),
    userId,
    name,
    content,
    contentHash,
    pinnedAt: null,
    createdAt: now,
    updatedAt: now,
    activeAt: now,
    deletedAt: null,
  };
  db.insert(clips).values(row).run();
  return { clip: row, deduplicated: false };
}

export function listPinnedClips(db: DbOrTx, userId: string): ClipRow[] {
  return db
    .select()
    .from(clips)
    .where(and(eq(clips.userId, userId), isNull(clips.deletedAt), isNotNull(clips.pinnedAt)))
    .orderBy(desc(clips.pinnedAt))
    .all();
}

export function encodeCursor(activeAt: number, id: string): string {
  return Buffer.from(JSON.stringify([activeAt, id]), "utf8").toString("base64url");
}

export function decodeCursor(raw: string): { activeAt: number; id: string } {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === "number" &&
      typeof parsed[1] === "string"
    ) {
      return { activeAt: parsed[0], id: parsed[1] };
    }
  } catch {
    // falls through to the validation error below
  }
  throw new AppError(400, "VALIDATION_ERROR", "请求参数不正确");
}

function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function listClips(
  db: DbOrTx,
  params: {
    userId: string;
    q: string | null;
    cursor: { activeAt: number; id: string } | null;
    limit: number;
  },
): { items: ClipRow[]; nextCursor: string | null } {
  const conditions = [eq(clips.userId, params.userId), isNull(clips.deletedAt)];
  if (params.q === null) {
    // The default list only holds unpinned clips; searching covers both groups.
    conditions.push(isNull(clips.pinnedAt));
  } else {
    const pattern = `%${escapeLike(params.q)}%`;
    conditions.push(
      sql`(${clips.content} LIKE ${pattern} ESCAPE '\\' OR ${clips.name} LIKE ${pattern} ESCAPE '\\')`,
    );
  }
  if (params.cursor) {
    const { activeAt, id } = params.cursor;
    conditions.push(
      sql`(${clips.activeAt} < ${activeAt}) OR (${clips.activeAt} = ${activeAt} AND ${clips.id} < ${id})`,
    );
  }
  const rows = db
    .select()
    .from(clips)
    .where(and(...conditions))
    .orderBy(desc(clips.activeAt), desc(clips.id))
    .limit(params.limit + 1)
    .all();
  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last.activeAt, last.id) : null,
  };
}

export function getClip(db: DbOrTx, userId: string, id: string): ClipRow {
  const row = db
    .select()
    .from(clips)
    .where(and(eq(clips.id, id), eq(clips.userId, userId), isNull(clips.deletedAt)))
    .get();
  if (!row) {
    // 404 even when the clip belongs to someone else: do not leak existence.
    throw new AppError(404, "NOT_FOUND", "内容不存在");
  }
  return row;
}

export function updateClip(
  db: DbOrTx,
  userId: string,
  id: string,
  patch: { content?: string; pinned?: boolean; name?: string | null },
  maxTextBytes: number,
): ClipRow {
  const row = getClip(db, userId, id);
  const now = Date.now();
  const set: Partial<
    Pick<ClipRow, "content" | "contentHash" | "pinnedAt" | "updatedAt" | "activeAt" | "name">
  > = {};
  if (patch.content !== undefined) {
    assertValidContent(patch.content, maxTextBytes);
    set.content = patch.content;
    set.contentHash = sha256(patch.content);
    // activeAt intentionally untouched: editing must not reorder the list.
    set.updatedAt = now;
  }
  if (patch.name !== undefined) {
    set.name = normalizeClipName(patch.name) ?? null;
  }
  if (patch.pinned === true && row.pinnedAt === null) {
    set.pinnedAt = now;
  } else if (patch.pinned === false && row.pinnedAt !== null) {
    // Unpinned clips re-enter the recent list at the top.
    set.pinnedAt = null;
    set.activeAt = now;
  }
  if (Object.keys(set).length > 0) {
    db.update(clips).set(set).where(eq(clips.id, row.id)).run();
  }
  return { ...row, ...set };
}

export function softDeleteClip(db: DbOrTx, userId: string, id: string): void {
  const row = getClip(db, userId, id);
  db.update(clips).set({ deletedAt: Date.now() }).where(eq(clips.id, row.id)).run();
}

export function restoreClip(db: DbOrTx, userId: string, id: string): ClipRow {
  const row = db
    .select()
    .from(clips)
    .where(and(eq(clips.id, id), eq(clips.userId, userId), isNotNull(clips.deletedAt)))
    .get();
  if (!row) {
    throw new AppError(404, "NOT_FOUND", "内容不存在");
  }
  db.update(clips).set({ deletedAt: null }).where(eq(clips.id, row.id)).run();
  return { ...row, deletedAt: null };
}
