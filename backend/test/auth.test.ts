import assert from "node:assert/strict";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { users } from "../src/db/schema.js";
import {
  authed,
  createTestApp,
  enableRegistration,
  login,
  registerUser,
  sessionCookie,
  setupAdmin,
  TEST_INIT_CODE,
} from "./helpers.js";

test("status: uninitialized system reports initialized=false; register is closed", async () => {
  const { app, close } = await createTestApp();
  const status = await app.inject({ method: "GET", url: "/api/system/status" });
  assert.equal(status.statusCode, 200);
  assert.deepEqual(status.json(), {
    initialized: false,
    registrationOpen: false,
    maxTextBytes: 1024 * 1024,
  });

  const res = await registerUser(app, "alice", "alice-password", "WHATEVER1");
  assert.equal(res.statusCode, 403);
  assert.equal(res.json().error.code, "REGISTRATION_CLOSED");
  await close();
});

test("setup: wrong init code -> 403; correct code -> 201 with admin role and cookie", async () => {
  const { app, close } = await createTestApp();
  const wrong = await setupAdmin(app, "wrong-code");
  assert.equal(wrong.statusCode, 403);
  assert.equal(wrong.json().error.code, "INIT_CODE_INVALID");

  const ok = await setupAdmin(app);
  assert.equal(ok.statusCode, 201);
  assert.equal(ok.json().user.role, "admin");
  assert.ok(ok.cookies.some((c) => c.name === "ecv_session"));
  await close();
});

test("setup: init code comparison ignores case, spaces and hyphens", async () => {
  const { app, close } = await createTestApp();
  const res = await setupAdmin(app, " Test Init Code 123 ");
  assert.equal(res.statusCode, 201);
  await close();
});

test("setup: second call after initialization -> 409", async () => {
  const { app, close } = await createTestApp();
  assert.equal((await setupAdmin(app)).statusCode, 201);
  const again = await setupAdmin(app);
  assert.equal(again.statusCode, 409);
  assert.equal(again.json().error.code, "ALREADY_INITIALIZED");
  await close();
});

test("setup: five concurrent calls produce exactly one admin", async () => {
  const { app, close } = await createTestApp();
  const results = await Promise.all(
    Array.from({ length: 5 }, (_, i) => setupAdmin(app, TEST_INIT_CODE, `admin${i}`)),
  );
  const created = results.filter((r) => r.statusCode === 201);
  const conflicts = results.filter((r) => r.statusCode === 409);
  assert.equal(created.length, 1);
  assert.equal(conflicts.length, 4);
  await close();
});

test("register: closed -> 403; wrong code -> 403; fuzzy code passes; duplicate username (case-insensitive) -> 409", async () => {
  const { app, db, close } = await createTestApp();
  assert.equal((await setupAdmin(app)).statusCode, 201);

  const closed = await registerUser(app, "alice", "alice-password", "TESTCODE8");
  assert.equal(closed.statusCode, 403);
  assert.equal(closed.json().error.code, "REGISTRATION_CLOSED");

  enableRegistration(db);
  const wrongCode = await registerUser(app, "alice", "alice-password", "WRONGCODE");
  assert.equal(wrongCode.statusCode, 403);
  assert.equal(wrongCode.json().error.code, "INVITE_CODE_INVALID");

  const fuzzy = await registerUser(app, "Alice", "alice-password", " test code 8 ");
  assert.equal(fuzzy.statusCode, 201);
  assert.equal(fuzzy.json().user.role, "user");

  const dup = await registerUser(app, "alice", "alice-password", "TESTCODE8");
  assert.equal(dup.statusCode, 409);
  assert.equal(dup.json().error.code, "USERNAME_TAKEN");
  await close();
});

test("login: unknown user and wrong password share the same 401; username lookup is case-insensitive", async () => {
  const { app, db, close } = await createTestApp();
  await setupAdmin(app);
  enableRegistration(db);
  await registerUser(app, "Alice", "alice-password", "TESTCODE8");

  const unknown = await login(app, "bob", "bob-password");
  assert.equal(unknown.statusCode, 401);
  assert.equal(unknown.json().error.code, "INVALID_CREDENTIALS");

  const wrong = await login(app, "Alice", "wrong-password");
  assert.equal(wrong.statusCode, 401);
  assert.equal(wrong.json().error.code, "INVALID_CREDENTIALS");

  const upper = await login(app, "ALICE", "alice-password");
  assert.equal(upper.statusCode, 200);
  assert.equal(upper.json().user.username, "Alice");
  await close();
});

test("login: disabled account -> 403 with correct password, 401 with wrong password", async () => {
  const { app, db, close } = await createTestApp();
  await setupAdmin(app);
  enableRegistration(db);
  const reg = await registerUser(app, "alice", "alice-password", "TESTCODE8");
  const userId = reg.json().user.id;
  db.update(users).set({ status: "disabled" }).where(eq(users.id, userId)).run();

  const wrong = await login(app, "alice", "wrong-password");
  assert.equal(wrong.statusCode, 401);

  const right = await login(app, "alice", "alice-password");
  assert.equal(right.statusCode, 403);
  assert.equal(right.json().error.code, "ACCOUNT_DISABLED");
  await close();
});

test("me: with cookie -> 200; without -> 401; after logout old cookie -> 401", async () => {
  const { app, close } = await createTestApp();
  const setup = await setupAdmin(app);
  const cookie = sessionCookie(setup);

  const me = await authed(app, cookie)({ method: "GET", url: "/api/auth/me" });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().user.username, "admin");

  const anon = await app.inject({ method: "GET", url: "/api/auth/me" });
  assert.equal(anon.statusCode, 401);

  const logout = await authed(app, cookie)({ method: "POST", url: "/api/auth/logout" });
  assert.equal(logout.statusCode, 204);

  const after = await authed(app, cookie)({ method: "GET", url: "/api/auth/me" });
  assert.equal(after.statusCode, 401);
  await close();
});

test("password change: wrong current -> 400; success keeps current session, kills others, new password works", async () => {
  const { app, close } = await createTestApp();
  await setupAdmin(app);
  const first = sessionCookie(await login(app, "admin", "admin-password"));
  const second = sessionCookie(await login(app, "admin", "admin-password"));

  const wrong = await authed(app, first)({
    method: "PUT",
    url: "/api/auth/password",
    payload: { currentPassword: "nope-nope", newPassword: "new-password-1" },
  });
  assert.equal(wrong.statusCode, 400);
  assert.equal(wrong.json().error.code, "WRONG_PASSWORD");

  const ok = await authed(app, first)({
    method: "PUT",
    url: "/api/auth/password",
    payload: { currentPassword: "admin-password", newPassword: "new-password-1" },
  });
  assert.equal(ok.statusCode, 204);

  assert.equal(
    (await authed(app, first)({ method: "GET", url: "/api/auth/me" })).statusCode,
    200,
  );
  assert.equal(
    (await authed(app, second)({ method: "GET", url: "/api/auth/me" })).statusCode,
    401,
  );
  assert.equal((await login(app, "admin", "admin-password")).statusCode, 401);
  assert.equal((await login(app, "admin", "new-password-1")).statusCode, 200);
  await close();
});

test("cookie: HttpOnly + SameSite=Lax; Secure only behind https", async () => {
  const { app, close } = await createTestApp();
  const res = await setupAdmin(app);
  const header = res.headers["set-cookie"];
  const text = Array.isArray(header) ? header.join(";") : (header ?? "");
  assert.match(text, /HttpOnly/i);
  assert.match(text, /SameSite=Lax/);
  assert.doesNotMatch(text, /Secure/);
  await close();

  const https = await createTestApp({ env: { TRUST_PROXY: "true" } });
  const res2 = await https.app.inject({
    method: "POST",
    url: "/api/setup",
    payload: { username: "admin", password: "admin-password", initCode: TEST_INIT_CODE },
    headers: { "x-forwarded-proto": "https" },
  });
  const header2 = res2.headers["set-cookie"];
  const text2 = Array.isArray(header2) ? header2.join(";") : (header2 ?? "");
  assert.match(text2, /Secure/);
  await https.close();
});

test("origin check: mismatch -> 403; match or absent -> ok", async () => {
  const { app, close } = await createTestApp();
  await setupAdmin(app);

  const mismatch = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username: "admin", password: "admin-password" },
    headers: { host: "example.test:8000", origin: "http://evil.test" },
  });
  assert.equal(mismatch.statusCode, 403);
  assert.equal(mismatch.json().error.code, "ORIGIN_MISMATCH");

  const opaque = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username: "admin", password: "admin-password" },
    headers: { host: "example.test:8000", origin: "null" },
  });
  assert.equal(opaque.statusCode, 403);

  const match = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username: "admin", password: "admin-password" },
    headers: { host: "example.test:8000", origin: "http://example.test:8000" },
  });
  assert.equal(match.statusCode, 200);

  const absent = await login(app, "admin", "admin-password");
  assert.equal(absent.statusCode, 200);
  await close();
});

test("rate limit: 11th login from the same IP -> 429", async () => {
  const { app, close } = await createTestApp({
    rateLimit: { max: 10, timeWindow: 15 * 60 * 1000 },
  });
  await setupAdmin(app);
  let lastStatus = 0;
  let lastCode = "";
  for (let i = 0; i < 11; i++) {
    const res = await login(app, "admin", "admin-password");
    lastStatus = res.statusCode;
    lastCode = res.json().error?.code ?? "";
  }
  assert.equal(lastStatus, 429);
  assert.equal(lastCode, "RATE_LIMITED");
  await close();
});

test("validation: malformed body -> 400 VALIDATION_ERROR", async () => {
  const { app, close } = await createTestApp();
  const res = await setupAdmin(app, TEST_INIT_CODE, "ab", "admin-password");
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().error.code, "VALIDATION_ERROR");
  await close();
});
