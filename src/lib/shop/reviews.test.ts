import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SAMPLE_REVIEWS,
  averageRating,
  isReviewStatus,
  mapReviewRow,
  normalizeReviewInput,
  publicReview,
  toIsoDate,
} from "./reviews.ts";

describe("normalizeReviewInput", () => {
  it("trims name and comment and keeps a 1–5 integer rating", () => {
    const row = normalizeReviewInput({
      name: "  Jordan M.  ",
      rating: 5,
      comment: "  HDMI from the hub to the TV just worked.  ",
    });
    assert.equal(row.name, "Jordan M.");
    assert.equal(row.rating, 5);
    assert.equal(row.comment, "HDMI from the hub to the TV just worked.");
  });

  it("rejects a short name, out-of-range rating, and thin comment", () => {
    assert.throws(() => normalizeReviewInput({ name: "A", rating: 5, comment: "Great controller, no drift." }), /Name/);
    assert.throws(
      () => normalizeReviewInput({ name: "Jordan", rating: 6, comment: "Great controller, no drift." }),
      /Rating/,
    );
    assert.throws(() => normalizeReviewInput({ name: "Jordan", rating: 3.5, comment: "Great controller, no drift." }), /Rating/);
    assert.throws(() => normalizeReviewInput({ name: "Jordan", rating: 5, comment: "Too short" }), /review/);
  });
});

describe("SAMPLE_REVIEWS", () => {
  it("seeds realistic accessory reviews with unique keys and valid ratings", () => {
    const keys = SAMPLE_REVIEWS.map((row) => row.seedKey);
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(SAMPLE_REVIEWS.length >= 4);
    const hay = SAMPLE_REVIEWS.map((row) => row.comment).join(" ").toLowerCase();
    assert.match(hay, /hdmi/);
    assert.match(hay, /controller/);
    assert.match(hay, /hub/);
    for (const row of SAMPLE_REVIEWS) {
      assert.ok(row.rating >= 1 && row.rating <= 5);
      assert.doesNotThrow(() =>
        normalizeReviewInput({ name: row.name, rating: row.rating, comment: row.comment }),
      );
    }
  });
});

describe("review helpers", () => {
  it("maps a database row and hides status on the public shape", () => {
    const mapped = mapReviewRow({
      id: 3,
      name: "Priya S.",
      rating: 5,
      comment: "Core Controller sticks feel tight.",
      created_at: "2026-06-29T21:04:00.000Z",
      status: "approved",
    });
    assert.equal(mapped.id, 3);
    assert.equal(mapped.status, "approved");
    assert.equal(mapped.createdAt, "2026-06-29T21:04:00.000Z");
    assert.equal("status" in publicReview(mapped), false);
    assert.equal(isReviewStatus("pending"), true);
    assert.equal(isReviewStatus("spam"), false);
    assert.equal(toIsoDate(new Date("2026-04-09T19:22:00.000Z")), "2026-04-09T19:22:00.000Z");
    assert.equal(averageRating([{ rating: 5 }, { rating: 4 }]), 4.5);
    assert.equal(averageRating([]), 0);
  });
});
