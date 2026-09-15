import assert from "node:assert/strict";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Db } from "../src/db/client.js";
import { clips, sessions } from "../src/db/schema.js";
import { runCleanup } from "../src/jobs/cleanup.js";
import {
  authed,
  createTestApp,
  enableRegistration,
  registerUser,
  sessionCookie,
  setupAdmin,
} from "./helpers.js";

const tick = (ms = 5): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function makeUser(
  app: FastifyInstance,
  db: Db,
  username: string,
): Promise<{ cookie: string; userId: string }> {
  enableRegistration(db);
  const res = await registerUser(app, username, `${username}-password`, "TESTCODE8");
  assert.equal(res.statusCode, 201);
  return { cookie: sessionCookie(res), userId: res.json().user.id as string };
}

async function createClip(app: FastifyInstance, cookie: string, content: string) {
  return authed(app, cookie)({ method: "POST", url: "/api/clips", payload: { content } });
}

test("create: ok -> 201; empty/whitespace -> 400; surrounding spaces preserved; oversized -> 413", async () => {
  const { app, db, close } = await createTestApp({ env: { MAX_TEXT_SIZE_KB: "1" } });
  await setupAdmin(app);
  const { cookie } = await makeUser(app, db, "alice");

  const ok = await createClip(app, cookie, "  padded  ");
  assert.equal(ok.statusCode, 201);
  assert.equal(ok.json().clip.content, "  padded  ");
  assert.equal(ok.json().deduplicated, false);

  for (const empty of ["", "   ", " \n\t "]) {
    const res = await createClip(app, cookie, empty);
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, "EMPTY_CONTENT");
  }

  const maxed = await createClip(app, cookie, "a".repeat(1024));
  assert.equal(maxed.statusCode, 201);
  const tooBig = await createClip(app, cookie, "a".repeat(1025));
  assert.equal(tooBig.statusCode, 413);
  assert.equal(tooBig.json().error.code, "TEXT_TOO_LARGE");
  await close();
});

test("dedup: same content twice -> 200 same id, activeAt bumped; pinned stays put; deleted is recreated", async () => {
  const { app, db, close } = await createTestApp();
  await setupAdmin(app);
  const { cookie } = await makeUser(app, db, "alice");

  const first = (await createClip(app, cookie, "dup")).json().clip;
  await tick();
  const second = await createClip(app, cookie, "dup");
  assert.equal(second.statusCode, 200);
  assert.equal(second.json().deduplicated, true);
  assert.equal(second.json().clip.id, first.id);
  assert.ok(second.json().clip.activeAt > first.activeAt);

  await authed(app, cookie)({
    method: "PATCH",
    url: `/api/clips/${first.id}`,
    payload: { pinned: true },
  });
  const third = await createClip(app, cookie, "dup");
  assert.equal(third.json().deduplicated, true);
  assert.equal(third.json().clip.activeAt, second.json().clip.activeAt);

  await authed(app, cookie)({ method: "DELETE", url: `/api/clips/${first.id}` });
  const fourth = await createClip(app, cookie, "dup");
  assert.equal(fourth.statusCode, 201);
  assert.notEqual(fourth.json().clip.id, first.id);
  await close();
});

test("list: 35 clips paginate 30 + 5 without duplicates; pinned excluded; pinned list newest first", async () => {
  const { app, db, close } = await createTestApp();
  await setupAdmin(app);
  const { cookie } = await makeUser(app, db, "alice");

  for (let i = 0; i < 35; i++) {
    await createClip(app, cookie, `clip-${String(i).padStart(2, "0")}`);
  }
  const page1 = await authed(app, cookie)({ method: "GET", url: "/api/clips" });
  assert.equal(page1.statusCode, 200);
  assert.equal(page1.json().items.length, 30);
  assert.ok(page1.json().nextCursor);

  const page2 = await authed(app, cookie)({
    method: "GET",
    url: `/api/clips?cursor=${encodeURIComponent(page1.json().nextCursor)}`,
  });
  assert.equal(page2.json().items.length, 5);
  assert.equal(page2.json().nextCursor, null);

  const ids = new Set([...page1.json().items, ...page2.json().items].map((c) => c.id));
  assert.equal(ids.size, 35);

  const bad = await authed(app, cookie)({ method: "GET", url: "/api/clips?cursor=!!!" });
  assert.equal(bad.statusCode, 400);

  // Pinned clips leave the default list and show up newest-pin first.
  const toPin1 = page1.json().items[5].id;
  const toPin2 = page1.json().items[10].id;
  await authed(app, cookie)({ method: "PATCH", url: `/api/clips/${toPin1}`, payload: { pinned: true } });
  await tick();
  await authed(app, cookie)({ method: "PATCH", url: `/api/clips/${toPin2}`, payload: { pinned: true } });

  const def = await authed(app, cookie)({ method: "GET", url: "/api/clips?limit=100" });
  assert.equal(def.json().items.length, 33);
  assert.ok(!def.json().items.some((c: { id: string }) => c.id === toPin1));

  const pinned = await authed(app, cookie)({ method: "GET", url: "/api/clips?pinned=true" });
  assert.equal(pinned.json().items.length, 2);
  assert.equal(pinned.json().items[0].id, toPin2);
  assert.equal(pinned.json().items[1].id, toPin1);
  await close();
});

test("search: case-insensitive, covers pinned, escapes % and _, handles Chinese", async () => {
  const { app, db, close } = await createTestApp();
  await setupAdmin(app);
  const { cookie } = await makeUser(app, db, "alice");

  await createClip(app, cookie, "Hello World");
  await createClip(app, cookie, "hello 你好");
  await createClip(app, cookie, "100% 完成");
  await createClip(app, cookie, "a_b");

  const search = async (q: string) =>
    (await authed(app, cookie)({ method: "GET", url: `/api/clips?q=${encodeURIComponent(q)}` }))
      .json().items;

  assert.equal((await search("HELLO")).length, 2);
  assert.equal((await search("%")).length, 1);
  assert.equal((await search("_")).length, 1);
  assert.equal((await search("你好")).length, 1);

  const all = await authed(app, cookie)({ method: "GET", url: "/api/clips" });
  const pinId = all.json().items.find((c: { content: string }) => c.content === "Hello World").id;
  await authed(app, cookie)({ method: "PATCH", url: `/api/clips/${pinId}`, payload: { pinned: true } });
  assert.equal((await search("hello")).length, 2);
  await close();
});

test("edit: bumps updatedAt only, allows duplicate content; pin toggling keeps updatedAt, unpin moves to top", async () => {
  const { app, db, close } = await createTestApp();
  await setupAdmin(app);
  const { cookie } = await makeUser(app, db, "alice");

  await createClip(app, cookie, "first");
  await tick();
  const second = (await createClip(app, cookie, "second")).json().clip;

  await tick();
  const edited = await authed(app, cookie)({
    method: "PATCH",
    url: `/api/clips/${second.id}`,
    payload: { content: "first" },
  });
  assert.equal(edited.statusCode, 200);
  assert.equal(edited.json().clip.content, "first");
  assert.ok(edited.json().clip.updatedAt > edited.json().clip.createdAt);
  assert.equal(edited.json().clip.activeAt, second.activeAt);

  const pinned = await authed(app, cookie)({
    method: "PATCH",
    url: `/api/clips/${second.id}`,
    payload: { pinned: true },
  });
  assert.equal(pinned.json().clip.updatedAt, edited.json().clip.updatedAt);
  assert.ok(pinned.json().clip.pinnedAt);

  const emptyPatch = await authed(app, cookie)({
    method: "PATCH",
    url: `/api/clips/${second.id}`,
    payload: {},
  });
  assert.equal(emptyPatch.statusCode, 400);

  await tick();
  const unpinned = await authed(app, cookie)({
    method: "PATCH",
    url: `/api/clips/${second.id}`,
    payload: { pinned: false },
  });
  assert.equal(unpinned.json().clip.pinnedAt, null);
  assert.ok(unpinned.json().clip.activeAt > pinned.json().clip.activeAt);

  const list = await authed(app, cookie)({ method: "GET", url: "/api/clips" });
  assert.equal(list.json().items[0].id, second.id);
  await close();
});

test("name: create/patch/search semantics", async () => {
  const { app, db, close } = await createTestApp();
  await setupAdmin(app);
  const { cookie } = await makeUser(app, db, "alice");

  const created = await authed(app, cookie)({
    method: "POST",
    url: "/api/clips",
    payload: { content: "deploy commands", name: "  部署命令  " },
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().clip.name, "部署命令");

  const noName = (await createClip(app, cookie, "plain")).json().clip;
  assert.equal(noName.name, null);
  const blankName = (
    await authed(app, cookie)({
      method: "POST",
      url: "/api/clips",
      payload: { content: "blank name", name: "   " },
    })
  ).json().clip;
  assert.equal(blankName.name, null);

  // Dedup hit keeps the existing clip's name.
  const dup = await authed(app, cookie)({
    method: "POST",
    url: "/api/clips",
    payload: { content: "deploy commands", name: "别的名字" },
  });
  assert.equal(dup.json().deduplicated, true);
  assert.equal(dup.json().clip.name, "部署命令");

  // Rename only: updatedAt/activeAt untouched (activeAt reflects the dedup bump).
  await tick();
  const renamed = await authed(app, cookie)({
    method: "PATCH",
    url: `/api/clips/${created.json().clip.id}`,
    payload: { name: "服务器命令" },
  });
  assert.equal(renamed.json().clip.name, "服务器命令");
  assert.equal(renamed.json().clip.updatedAt, created.json().clip.updatedAt);
  assert.equal(renamed.json().clip.activeAt, dup.json().clip.activeAt);

  // Clearing the name with a blank string.
  const cleared = await authed(app, cookie)({
    method: "PATCH",
    url: `/api/clips/${created.json().clip.id}`,
    payload: { name: "  " },
  });
  assert.equal(cleared.json().clip.name, null);

  const tooLong = await authed(app, cookie)({
    method: "PATCH",
    url: `/api/clips/${created.json().clip.id}`,
    payload: { name: "x".repeat(65) },
  });
  assert.equal(tooLong.statusCode, 400);

  // Search matches names too.
  await authed(app, cookie)({
    method: "PATCH",
    url: `/api/clips/${created.json().clip.id}`,
    payload: { name: "服务器命令" },
  });
  const byName = await authed(app, cookie)({ method: "GET", url: "/api/clips?q=服务器" });
  assert.equal(byName.json().items.length, 1);
  assert.equal(byName.json().items[0].id, created.json().clip.id);
  await close();
});

test("delete & restore: deleted clip leaves the list, restore brings it back; 404s for bad states", async () => {
  const { app, db, close } = await createTestApp();
  await setupAdmin(app);
  const { cookie } = await makeUser(app, db, "alice");

  const clip = (await createClip(app, cookie, "temporary")).json().clip;
  const del = await authed(app, cookie)({ method: "DELETE", url: `/api/clips/${clip.id}` });
  assert.equal(del.statusCode, 204);

  const list = await authed(app, cookie)({ method: "GET", url: "/api/clips" });
  assert.equal(list.json().items.length, 0);

  const restored = await authed(app, cookie)({
    method: "POST",
    url: `/api/clips/${clip.id}/restore`,
  });
  assert.equal(restored.statusCode, 200);
  assert.equal(restored.json().clip.id, clip.id);

  const again = await authed(app, cookie)({ method: "POST", url: `/api/clips/${clip.id}/restore` });
  assert.equal(again.statusCode, 404);

  await authed(app, cookie)({ method: "DELETE", url: `/api/clips/${clip.id}` });
  runCleanup(db, Date.now() + 25 * 60 * 60 * 1000);
  const gone = await authed(app, cookie)({ method: "POST", url: `/api/clips/${clip.id}/restore` });
  assert.equal(gone.statusCode, 404);

  const missing = await authed(app, cookie)({ method: "DELETE", url: "/api/clips/nope" });
  assert.equal(missing.statusCode, 404);
  await close();
});

test("isolation: user B cannot read, modify, delete, restore or search user A's clips", async () => {
  const { app, db, close } = await createTestApp();
  await setupAdmin(app);
  const a = await makeUser(app, db, "alice");
  const b = await makeUser(app, db, "bob");

  const clip = (await createClip(app, a.cookie, "alice secret")).json().clip;

  for (const req of [
    { method: "PATCH", url: `/api/clips/${clip.id}`, payload: { content: "hacked" } },
    { method: "DELETE", url: `/api/clips/${clip.id}` },
    { method: "POST", url: `/api/clips/${clip.id}/restore` },
  ] as const) {
    const res = await authed(app, b.cookie)(req);
    assert.equal(res.statusCode, 404);
  }

  const list = await authed(app, b.cookie)({ method: "GET", url: "/api/clips" });
  assert.equal(list.json().items.length, 0);
  const search = await authed(app, b.cookie)({ method: "GET", url: "/api/clips?q=secret" });
  assert.equal(search.json().items.length, 0);
  await close();
});

test("cleanup: only soft-deleted clips older than 24h and expired sessions are removed", async () => {
  const { app, db, close } = await createTestApp();
  await setupAdmin(app);
  const { cookie } = await makeUser(app, db, "alice");

  const kept = (await createClip(app, cookie, "kept")).json().clip;
  const doomed = (await createClip(app, cookie, "doomed")).json().clip;
  await authed(app, cookie)({ method: "DELETE", url: `/api/clips/${doomed.id}` });

  // Too recent: nothing is collected.
  runCleanup(db, Date.now() + 23 * 60 * 60 * 1000);
  assert.equal(
    db.select().from(clips).where(eq(clips.id, doomed.id)).get()?.deletedAt === null,
    false,
  );

  // Past the retention window: gone physically.
  const result = runCleanup(db, Date.now() + 25 * 60 * 60 * 1000);
  assert.equal(result.clips, 1);
  assert.equal(db.select().from(clips).where(eq(clips.id, doomed.id)).get(), undefined);
  assert.notEqual(db.select().from(clips).where(eq(clips.id, kept.id)).get(), undefined);

  // Sessions: current one survives a normal run, and is collected once expired.
  assert.ok(db.select().from(sessions).all().length > 0);
  runCleanup(db, Date.now() + 31 * 24 * 60 * 60 * 1000);
  assert.equal(db.select().from(sessions).all().length, 0);
  const me = await authed(app, cookie)({ method: "GET", url: "/api/auth/me" });
  assert.equal(me.statusCode, 401);
  await close();
});
