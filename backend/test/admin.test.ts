import assert from "node:assert/strict";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Db } from "../src/db/client.js";
import { clips, sessions, users } from "../src/db/schema.js";
import {
  authed,
  createTestApp,
  enableRegistration,
  login,
  registerUser,
  sessionCookie,
  setupAdmin,
} from "./helpers.js";

async function makeUser(
  app: FastifyInstance,
  db: Db,
  username: string,
): Promise<{ cookie: string; userId: string }> {
  enableRegistration(db);
  const res = await registerUser(app, username, `${username.split("@")[0]}-password`, "TESTCODE8");
  assert.equal(res.statusCode, 201);
  return { cookie: sessionCookie(res), userId: res.json().user.id as string };
}

test("admin api: anonymous -> 401, regular user -> 403", async () => {
  const { app, db, close } = await createTestApp();
  await setupAdmin(app);
  const { cookie } = await makeUser(app, db, "alice@example.com");

  for (const req of [
    { method: "GET", url: "/api/admin/users" },
    { method: "GET", url: "/api/admin/settings" },
    { method: "POST", url: "/api/admin/settings/invite-code" },
  ] as const) {
    assert.equal((await app.inject(req)).statusCode, 401);
    const res = await authed(app, cookie)(req);
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error.code, "FORBIDDEN");
  }
  await close();
});

test("users list: admin first, clipCount ignores soft-deleted clips", async () => {
  const { app, db, close } = await createTestApp();
  const setup = await setupAdmin(app);
  const adminCookie = sessionCookie(setup);
  const alice = await makeUser(app, db, "alice@example.com");

  await authed(app, alice.cookie)({
    method: "POST",
    url: "/api/clips",
    payload: { content: "one" },
  });
  const second = await authed(app, alice.cookie)({
    method: "POST",
    url: "/api/clips",
    payload: { content: "two" },
  });
  await authed(app, alice.cookie)({
    method: "DELETE",
    url: `/api/clips/${second.json().clip.id}`,
  });

  const res = await authed(app, adminCookie)({ method: "GET", url: "/api/admin/users" });
  assert.equal(res.statusCode, 200);
  const items = res.json().items;
  assert.equal(items.length, 2);
  assert.equal(items[0].username, "admin@example.com");
  assert.equal(items[0].role, "admin");
  assert.equal(items[1].username, "alice@example.com");
  assert.equal(items[1].clipCount, 1);
  assert.ok(items[1].lastLoginAt);
  await close();
});

test("disable: sessions die instantly, login -> 403; re-enable restores access", async () => {
  const { app, db, close } = await createTestApp();
  const adminCookie = sessionCookie(await setupAdmin(app));
  const alice = await makeUser(app, db, "alice@example.com");

  const disabled = await authed(app, adminCookie)({
    method: "PATCH",
    url: `/api/admin/users/${alice.userId}`,
    payload: { status: "disabled" },
  });
  assert.equal(disabled.statusCode, 200);
  assert.equal(disabled.json().user.status, "disabled");

  assert.equal(
    (await authed(app, alice.cookie)({ method: "GET", url: "/api/auth/me" })).statusCode,
    401,
  );
  const loginRes = await login(app, "alice@example.com", "alice-password");
  assert.equal(loginRes.statusCode, 403);
  assert.equal(loginRes.json().error.code, "ACCOUNT_DISABLED");

  const enabled = await authed(app, adminCookie)({
    method: "PATCH",
    url: `/api/admin/users/${alice.userId}`,
    payload: { status: "active" },
  });
  assert.equal(enabled.statusCode, 200);
  assert.equal((await login(app, "alice@example.com", "alice-password")).statusCode, 200);
  await close();
});

test("reset password: old sessions die, new password works, old one does not", async () => {
  const { app, db, close } = await createTestApp();
  const adminCookie = sessionCookie(await setupAdmin(app));
  const alice = await makeUser(app, db, "alice@example.com");

  const res = await authed(app, adminCookie)({
    method: "PUT",
    url: `/api/admin/users/${alice.userId}/password`,
    payload: { password: "reset-password-9" },
  });
  assert.equal(res.statusCode, 204);

  assert.equal(
    (await authed(app, alice.cookie)({ method: "GET", url: "/api/auth/me" })).statusCode,
    401,
  );
  assert.equal((await login(app, "alice@example.com", "alice-password")).statusCode, 401);
  assert.equal((await login(app, "alice@example.com", "reset-password-9")).statusCode, 200);
  await close();
});

test("delete: user, sessions and clips are all gone", async () => {
  const { app, db, close } = await createTestApp();
  const adminCookie = sessionCookie(await setupAdmin(app));
  const alice = await makeUser(app, db, "alice@example.com");
  await authed(app, alice.cookie)({
    method: "POST",
    url: "/api/clips",
    payload: { content: "bye" },
  });

  const res = await authed(app, adminCookie)({
    method: "DELETE",
    url: `/api/admin/users/${alice.userId}`,
  });
  assert.equal(res.statusCode, 204);

  assert.equal(db.select().from(users).where(eq(users.id, alice.userId)).get(), undefined);
  assert.equal(db.select().from(sessions).where(eq(sessions.userId, alice.userId)).all().length, 0);
  assert.equal(db.select().from(clips).where(eq(clips.userId, alice.userId)).all().length, 0);
  assert.equal((await login(app, "alice@example.com", "alice-password")).statusCode, 401);
  await close();
});

test("admin account itself cannot be disabled, reset or deleted; unknown id -> 404", async () => {
  const { app, close } = await createTestApp();
  const setup = await setupAdmin(app);
  const adminCookie = sessionCookie(setup);
  const adminId = setup.json().user.id as string;

  for (const req of [
    { method: "PATCH", url: `/api/admin/users/${adminId}`, payload: { status: "disabled" } },
    { method: "PUT", url: `/api/admin/users/${adminId}/password`, payload: { password: "whatever-123" } },
    { method: "DELETE", url: `/api/admin/users/${adminId}` },
  ] as const) {
    const res = await authed(app, adminCookie)(req);
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error.code, "CANNOT_MODIFY_ADMIN");
  }

  const missing = await authed(app, adminCookie)({
    method: "PATCH",
    url: "/api/admin/users/nope",
    payload: { status: "disabled" },
  });
  assert.equal(missing.statusCode, 404);
  await close();
});

test("registration settings: defaults, auto code on open, manual code normalization and validation", async () => {
  const { app, close } = await createTestApp();
  const adminCookie = sessionCookie(await setupAdmin(app));
  const authedAdmin = authed(app, adminCookie);

  const initial = await authedAdmin({ method: "GET", url: "/api/admin/settings" });
  assert.deepEqual(initial.json(), { registrationEnabled: false, inviteCode: null });

  const opened = await authedAdmin({
    method: "PATCH",
    url: "/api/admin/settings",
    payload: { registrationEnabled: true },
  });
  assert.equal(opened.json().registrationEnabled, true);
  const autoCode = opened.json().inviteCode as string;
  assert.match(autoCode, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);

  const status = await app.inject({ method: "GET", url: "/api/system/status" });
  assert.equal(status.json().registrationOpen, true);

  const manual = await authedAdmin({
    method: "PATCH",
    url: "/api/admin/settings",
    payload: { inviteCode: "abcd-1234" },
  });
  assert.equal(manual.json().inviteCode, "ABCD1234");

  for (const bad of ["ab", "abc!@#"]) {
    const res = await authedAdmin({
      method: "PATCH",
      url: "/api/admin/settings",
      payload: { inviteCode: bad },
    });
    assert.equal(res.statusCode, 400);
  }

  const empty = await authedAdmin({ method: "PATCH", url: "/api/admin/settings", payload: {} });
  assert.equal(empty.statusCode, 400);
  await close();
});

test("invite code regeneration invalidates the old code; closing registration keeps but disables it", async () => {
  const { app, close } = await createTestApp();
  const adminCookie = sessionCookie(await setupAdmin(app));
  const authedAdmin = authed(app, adminCookie);

  await authedAdmin({
    method: "PATCH",
    url: "/api/admin/settings",
    payload: { registrationEnabled: true, inviteCode: "OLDCODE1" },
  });

  const regenerated = await authedAdmin({
    method: "POST",
    url: "/api/admin/settings/invite-code",
  });
  const newCode = regenerated.json().inviteCode as string;
  assert.notEqual(newCode, "OLDCODE1");

  const oldTry = await registerUser(app, "alice@example.com", "alice-password", "OLDCODE1");
  assert.equal(oldTry.statusCode, 403);
  const newTry = await registerUser(app, "alice@example.com", "alice-password", newCode);
  assert.equal(newTry.statusCode, 201);

  const closed = await authedAdmin({
    method: "PATCH",
    url: "/api/admin/settings",
    payload: { registrationEnabled: false },
  });
  assert.equal(closed.json().inviteCode, newCode);

  const afterClose = await registerUser(app, "bob@example.com", "bob-password", newCode);
  assert.equal(afterClose.statusCode, 403);
  assert.equal(afterClose.json().error.code, "REGISTRATION_CLOSED");

  const status = await app.inject({ method: "GET", url: "/api/system/status" });
  assert.equal(status.json().registrationOpen, false);
  await close();
});
