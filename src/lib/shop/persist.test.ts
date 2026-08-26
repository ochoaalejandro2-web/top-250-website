import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertWritableCatalogItem,
  normalizeProductWrite,
  productPhotoPublicUrl,
} from "./persist.ts";

describe("normalizeProductWrite", () => {
  it("defaults new products to visible so they appear on the public shop", () => {
    const row = normalizeProductWrite({
      id: "",
      name: "Carbon Mouse Bungee",
      fullName: "",
      tag: "Desk",
      description: "Keeps the cable off the pad.",
      priceCents: 1499,
      weightLb: 0.2,
      imageUrl: "/api/product-image/abc",
      stock: 6,
    });
    assert.equal(row.id, "carbon-mouse-bungee");
    assert.equal(row.active, true);
    assert.equal(row.sortOrder, 99);
    assert.equal(row.fullName, "Carbon Mouse Bungee");
  });

  it("keeps an explicit hidden flag", () => {
    const row = normalizeProductWrite({
      id: "hub",
      name: "Link Hub",
      fullName: "TOP-250 Link USB-C Hub",
      tag: "HDMI + PD",
      description: "Hub",
      priceCents: 3999,
      weightLb: 0.28,
      imageUrl: "/products/hub.jpg",
      stock: 4,
      active: false,
    });
    assert.equal(row.active, false);
  });
});

describe("assertWritableCatalogItem", () => {
  it("rejects DMA / firmware hardware", () => {
    assert.throws(
      () =>
        assertWritableCatalogItem(
          normalizeProductWrite({
            id: "dma-100t",
            name: "DMA CARD 100T",
            fullName: "",
            tag: "",
            description: "BO7 firmware included",
            priceCents: 1,
            weightLb: 1,
            imageUrl: "",
            stock: 1,
          }),
        ),
      /accessories/,
    );
  });

  it("allows the seeded accessories", () => {
    assert.doesNotThrow(() =>
      assertWritableCatalogItem(
        normalizeProductWrite({
          id: "mouse",
          name: "Strike Mouse",
          fullName: "TOP-250 Strike Mouse",
          tag: "Wireless, 26K DPI",
          description: "Sub-60g wireless mouse",
          priceCents: 5999,
          weightLb: 0.18,
          imageUrl: "/products/mouse.jpg",
          stock: 24,
        }),
      ),
    );
  });
});

describe("productPhotoPublicUrl", () => {
  it("prefers a Vercel Blob URL and falls back to the Postgres route", () => {
    assert.equal(
      productPhotoPublicUrl({
        blobUrl: "https://abc.public.blob.vercel-storage.com/products/x.jpg",
        photoId: "p1",
      }),
      "https://abc.public.blob.vercel-storage.com/products/x.jpg",
    );
    assert.equal(productPhotoPublicUrl({ photoId: "p1" }), "/api/product-image/p1");
  });
});
