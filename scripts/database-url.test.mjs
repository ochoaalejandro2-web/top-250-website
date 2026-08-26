import assert from "node:assert/strict";
import { test } from "node:test";
import { isServerlessHost, readDatabaseUrl } from "./database-url.mjs";

test("readDatabaseUrl prefers DATABASE_URL then POSTGRES_URL", () => {
  assert.equal(readDatabaseUrl({}), undefined);
  assert.equal(readDatabaseUrl({ DATABASE_URL: "  " }), undefined);
  assert.equal(readDatabaseUrl({ DATABASE_URL: "postgres://a" }), "postgres://a");
  assert.equal(readDatabaseUrl({ POSTGRES_URL: "postgres://b" }), "postgres://b");
  assert.equal(
    readDatabaseUrl({ DATABASE_URL: "postgres://a", POSTGRES_URL: "postgres://b" }),
    "postgres://a",
  );
});

test("isServerlessHost detects Vercel and Netlify", () => {
  assert.equal(isServerlessHost({}), false);
  assert.equal(isServerlessHost({ VERCEL: "1" }), true);
  assert.equal(isServerlessHost({ NETLIFY: "true" }), true);
});
