import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catalogAssistantReply, scoreCatalogMatch } from "./assistant.ts";

const LIVE_LINEUP = [
  {
    id: "fuser",
    name: "HDMI Fuser",
    fullName: "TOP-250 FUSER",
    tag: "Wireless, 26K DPI",
    description: "FUSER",
    priceCents: 12000,
    weightLb: 0.18,
    stock: 24,
  },
  {
    id: "mouse",
    name: "Makcu",
    fullName: "TOP-250 Strike Mouse",
    tag: "Wireless, 26K DPI",
    description: "Makcu",
    priceCents: 4000,
    weightLb: 0.18,
    stock: 24,
  },
  {
    id: "deskpad",
    name: "Titan Desk Pad",
    fullName: "TOP-250 Titan XXL Desk Pad",
    tag: "900 x 400 mm",
    description: "Speed/control hybrid surface, stitched edges, non-slip base. One pad for mouse and keyboard.",
    priceCents: 2799,
    weightLb: 0.85,
    stock: 40,
  },
  {
    id: "bundle",
    name: "BUNBLE",
    fullName: "Bundle",
    tag: "",
    description: "All what you need is here. The new T100, fuser and Makcu with a new FW for COD.",
    priceCents: 23500,
    weightLb: 3,
    stock: 10,
  },
  {
    id: "t100",
    name: "t100",
    fullName: "t100",
    tag: "",
    description: "T100",
    priceCents: 12000,
    weightLb: 0.5,
    stock: 10,
  },
];

describe("catalog shop assistant fallback", () => {
  it("answers the HDMI fuser + PS5 question from catalog facts", () => {
    const text = catalogAssistantReply("Does the HDMI fuser work with PS5?", LIVE_LINEUP);
    assert.match(text, /HDMI Fuser/);
    assert.match(text, /TOP-250 FUSER/);
    assert.match(text, /\$120\.00/);
    assert.match(text, /24 in stock/);
    assert.match(text, /HDMI/);
    assert.doesNotMatch(text, /unavailable right now/i);
    assert.doesNotMatch(text, /could not answer/i);
    assert.doesNotMatch(text, /Phoenixwebhost|Stripe/i);
  });

  it("scores HDMI Fuser above other SKUs for that question", () => {
    const scores = LIVE_LINEUP.map((product) => ({
      id: product.id,
      score: scoreCatalogMatch("Does the HDMI fuser work with PS5?", product),
    }));
    const best = [...scores].sort((a, b) => b.score - a.score)[0];
    assert.equal(best.id, "fuser");
    assert.ok(best.score >= 3);
  });

  it("quotes USPS and UPS from a Phoenix ZIP", () => {
    const text = catalogAssistantReply("Shipping to 85001?", LIVE_LINEUP);
    assert.match(text, /USPS/);
    assert.match(text, /UPS/);
    assert.match(text, /Phoenix/);
    assert.doesNotMatch(text, /unavailable right now/i);
  });

  it("lists the live lineup when no SKU matches", () => {
    const text = catalogAssistantReply("Do you sell cameras?", LIVE_LINEUP);
    assert.match(text, /HDMI Fuser/);
    assert.match(text, /Makcu/);
    assert.match(text, /BUNBLE/);
    assert.match(text, /t100/);
    assert.doesNotMatch(text, /unavailable right now/i);
  });
});
