import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateShippingCents, zoneFromZip } from "./shipping.ts";

describe("Phoenix ZIP shipping estimates", () => {
  it("quotes USPS cheaper than UPS for a Phoenix ZIP", () => {
    assert.equal(zoneFromZip("85001"), 1);
    const quote = estimateShippingCents("85001", 1);
    assert.equal(typeof quote.USPS, "number");
    assert.equal(typeof quote.UPS, "number");
    assert.ok(quote.USPS > 0);
    assert.ok(quote.UPS > quote.USPS);
  });

  it("increases the quote for farther ZIPs", () => {
    const near = estimateShippingCents("85001", 2);
    const far = estimateShippingCents("10001", 2);
    assert.ok(far.USPS > near.USPS);
    assert.ok(far.UPS > near.UPS);
  });
});
