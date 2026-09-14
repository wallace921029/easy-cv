import { and, isNotNull, lt } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { clips } from "../db/schema.js";
import { deleteExpiredSessions } from "../services/sessions.js";

const SOFT_DELETE_RETENTION_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

type CleanupLogger = {
  info: (msg: string) => void;
  error: (err: unknown, msg?: string) => void;
};

export function runCleanup(
  db: Db,
  now: number = Date.now(),
): { clips: number; sessions: number } {
  const clipsResult = db
    .delete(clips)
    .where(and(isNotNull(clips.deletedAt), lt(clips.deletedAt, now - SOFT_DELETE_RETENTION_MS)))
    .run();
  return { clips: clipsResult.changes, sessions: deleteExpiredSessions(db, now) };
}

// Runs once at startup and then hourly. Lives outside buildApp so tests decide
// when to trigger cleanup themselves.
export function startCleanupJob(db: Db, logger: CleanupLogger): () => void {
  const run = (): void => {
    try {
      const { clips: clipCount, sessions: sessionCount } = runCleanup(db);
      if (clipCount + sessionCount > 0) {
        logger.info(`定时清理：物理删除 ${clipCount} 条剪贴板，${sessionCount} 个过期会话`);
      }
    } catch (err) {
      logger.error(err, "定时清理执行失败");
    }
  };
  run();
  const timer = setInterval(run, CLEANUP_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
