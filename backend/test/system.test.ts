import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestApp } from "./helpers.js";

test("GET /api/health returns 200", async () => {
  const { app, close } = await createTestApp();
  const res = await app.inject({ method: "GET", url: "/api/health" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true });
  await close();
});

test("unknown /api path returns JSON 404", async () => {
  const { app, close } = await createTestApp();
  const res = await app.inject({ method: "GET", url: "/api/nope" });
  assert.equal(res.statusCode, 404);
  assert.equal(res.json().error.code, "NOT_FOUND");
  await close();
});
