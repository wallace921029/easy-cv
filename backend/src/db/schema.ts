import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "user"] }).notNull(),
    status: text("status", { enum: ["active", "disabled"] }).notNull(),
    createdAt: integer("created_at").notNull(),
    lastLoginAt: integer("last_login_at"),
  },
  (t) => [uniqueIndex("users_username_lower_unique").on(sql`lower(${t.username})`)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    // Primary key is the SHA-256 of the session token, never the token itself.
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const clips = sqliteTable(
  "clips",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    pinnedAt: integer("pinned_at"),
    createdAt: integer("created_at").notNull(),
    // Bumped only when content is edited; updatedAt > createdAt means "edited".
    updatedAt: integer("updated_at").notNull(),
    activeAt: integer("active_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (t) => [
    index("clips_user_active_idx").on(t.userId, t.deletedAt, t.activeAt),
    index("clips_user_hash_idx").on(t.userId, t.contentHash),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type ClipRow = typeof clips.$inferSelect;
