import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { messages } from "./messages.ts";

describe("i18n dictionaries", () => {
  it("keeps English and Spanish keys in sync", () => {
    const en = Object.keys(messages.en).sort();
    const es = Object.keys(messages.es).sort();
    assert.deepEqual(es, en);
  });
});
