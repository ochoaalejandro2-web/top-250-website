import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { messages } from "./messages.ts";
import { OWNER } from "../shop/brand.ts";

describe("i18n dictionaries", () => {
  it("keeps English and Spanish keys in sync", () => {
    const en = Object.keys(messages.en).sort();
    const es = Object.keys(messages.es).sort();
    assert.deepEqual(es, en);
  });

  it("publishes owner initials instead of a personal name", () => {
    const hay = JSON.stringify(messages);
    assert.equal(OWNER, "AO");
    assert.doesNotMatch(hay, /Alex(?:andro)?\s+Ochoa/i);
    assert.doesNotMatch(hay, /Ochoa/i);
    assert.match(messages.en["footer.copyright"], /TOP-250 · AO/);
    assert.match(messages.es["footer.copyright"], /TOP-250 · AO/);
    assert.match(messages.en["contact.lead"], /\bAO\b/);
    assert.match(messages.es["contact.lead"], /\bAO\b/);
  });
});
