import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isBlockedCatalogItem, isCustomProductPhoto, slugFromName, splitTags } from "./catalog.ts";

describe("catalog guard", () => {
  it("blocks DMA / firmware hardware from the public catalog", () => {
    assert.equal(
      isBlockedCatalogItem({
        id: "dma-100t",
        name: "DMA CARD 100T",
        description: "This card has a BO7 Custom Firmware included.",
      }),
      true,
    );
    assert.equal(
      isBlockedCatalogItem({
        name: "Strike Mouse",
        description: "Sub-60g wireless mouse with a high-polling sensor.",
      }),
      false,
    );
  });

  it("keeps accessory names that are not DMA hardware", () => {
    for (const name of [
      "Strike Mouse",
      "Apex Keyboard",
      "Pulse Headset",
      "Titan Desk Pad",
      "Core Controller",
      "Frame Cam",
      "Glow Kit",
      "Link Hub",
    ]) {
      assert.equal(isBlockedCatalogItem({ id: name, name }), false);
    }
  });

  it("splits tags and detects uploaded photos", () => {
    assert.deepEqual(splitTags("Wireless · 26K DPI"), ["Wireless", "26K DPI"]);
    assert.equal(isCustomProductPhoto("/products/mouse.jpg"), false);
    assert.equal(isCustomProductPhoto("/api/product-image/abc"), true);
    assert.equal(slugFromName("Strike Mouse"), "strike-mouse");
  });
});
