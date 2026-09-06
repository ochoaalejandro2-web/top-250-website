/**
 * Shop reviews — validation and seed copy shared by the public page, admin,
 * and tests. Persistence lives in Postgres (`reviews`); this module stays
 * client-safe and has no database imports.
 */

export type ReviewStatus = "pending" | "approved" | "rejected";

export type Review = {
  id: number;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: ReviewStatus;
};

export type ReviewInput = {
  name: string;
  rating: number;
  comment: string;
};

export type ReviewSeed = {
  seedKey: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export const REVIEW_MIN_NAME = 2;
export const REVIEW_MAX_NAME = 60;
export const REVIEW_MIN_COMMENT = 12;
export const REVIEW_MAX_COMMENT = 400;
export const REVIEW_STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

/** Realistic Phoenix-shop samples shown (and persisted) when the table is empty. */
export const SAMPLE_REVIEWS: ReviewSeed[] = [
  {
    seedKey: "seed-hub-hdmi",
    name: "Jordan M.",
    rating: 5,
    comment:
      "Picked up the Link Hub for my living-room desk. HDMI to the TV just worked, and the laptop still charges off one cable. Packed in Phoenix and showed up quick.",
    createdAt: "2026-07-18T15:12:00.000Z",
  },
  {
    seedKey: "seed-controller",
    name: "Priya S.",
    rating: 5,
    comment:
      "The Core Controller finally killed stick drift on my weekend sessions. Hall-effect sticks feel tight, and AO answered a fit question the same afternoon.",
    createdAt: "2026-06-29T21:04:00.000Z",
  },
  {
    seedKey: "seed-hdmi-cable",
    name: "Chris R.",
    rating: 4,
    comment:
      "Needed a clean HDMI run from the hub to a 1440p monitor. Picture is sharp, no handshake drama. Wish the cable in the box was a foot longer — still a solid buy.",
    createdAt: "2026-06-11T18:40:00.000Z",
  },
  {
    seedKey: "seed-mouse",
    name: "Elena V.",
    rating: 5,
    comment:
      "Strike Mouse is light and the PTFE feet glide on the Titan pad. Prices were on the site — no “message for quote” nonsense. Will order a spare cable next.",
    createdAt: "2026-05-22T14:08:00.000Z",
  },
  {
    seedKey: "seed-headset",
    name: "Devon K.",
    rating: 5,
    comment:
      "Pulse Headset for late ranked nights. Mic is clear, clamp is friendly, and USPS from Phoenix beat the estimate. Helpful shop, fair prices.",
    createdAt: "2026-04-30T16:55:00.000Z",
  },
  {
    seedKey: "seed-keyboard",
    name: "Sam W.",
    rating: 4,
    comment:
      "Apex 75% is a clean board for the price. Hot-swap is easy. RGB is a little bright on default — two clicks and it was fine. Local shop energy, even on a web order.",
    createdAt: "2026-04-09T19:22:00.000Z",
  },
];

export function normalizeReviewInput(input: ReviewInput): {
  name: string;
  rating: number;
  comment: string;
} {
  const name = input.name.replace(/\s+/g, " ").trim();
  const comment = input.comment.replace(/\r\n/g, "\n").trim();
  const rating = Number(input.rating);

  if (name.length < REVIEW_MIN_NAME) throw new Error("Name is required");
  if (name.length > REVIEW_MAX_NAME) throw new Error("Please use a shorter name");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be 1 to 5 stars");
  }
  if (comment.length < REVIEW_MIN_COMMENT) {
    throw new Error("Please write a bit more in your review");
  }
  if (comment.length > REVIEW_MAX_COMMENT) {
    throw new Error("Please keep the review a little shorter");
  }
  return { name, rating, comment };
}

export function isReviewStatus(value: string): value is ReviewStatus {
  return REVIEW_STATUSES.includes(value as ReviewStatus);
}

export function toIsoDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return "";
}

export function mapReviewRow(row: {
  id: number;
  name: string;
  rating: number;
  comment: string;
  created_at: unknown;
  status: string;
}): Review {
  return {
    id: Number(row.id),
    name: row.name,
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: toIsoDate(row.created_at),
    status: isReviewStatus(row.status) ? row.status : "pending",
  };
}

export function publicReview(review: Review): Omit<Review, "status"> {
  const { status: _status, ...rest } = review;
  return rest;
}

export function averageRating(reviews: { rating: number }[]): number {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}
