import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PUBLIC_SHOP_ORIGIN } from "../auth/origins.ts";
import {
  assertStripeSecret,
  buildStripeLineItems,
  checkoutMetadata,
  checkoutReturnUrls,
  originFromRequestHeaders,
  publicImageForStripe,
  quoteCartLines,
  readStripeEnv,
  resolveCheckoutOrigin,
  shouldApplyPayment,
  stripeKeyMode,
  stripeSessionPaid,
  type CatalogProduct,
} from "./checkout.ts";

const mouse: CatalogProduct = {
  id: "mouse",
  name: "Strike Mouse",
  fullName: "TOP-250 Strike Mouse",
  priceCents: 5999,
  weightLb: 0.18,
  imageUrl: "/products/mouse.jpg",
  stock: 24,
  active: true,
};

describe("readStripeEnv", () => {
  it("reads the documented Vercel names and ignores blanks", () => {
    assert.deepEqual(
      readStripeEnv({
        STRIPE_SECRET_KEY: " sk_test_abc ",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_xyz",
        STRIPE_WEBHOOK_SECRET: "",
      }),
      {
        secretKey: "sk_test_abc",
        publishableKey: "pk_test_xyz",
        webhookSecret: undefined,
      },
    );
  });
});

describe("assertStripeSecret", () => {
  it("rejects a missing or publishable key", () => {
    assert.throws(() => assertStripeSecret(undefined), /STRIPE_SECRET_KEY/);
    assert.throws(() => assertStripeSecret("pk_test_xxx"), /not the publishable key/);
    assert.equal(assertStripeSecret("sk_test_xxx"), "sk_test_xxx");
  });
});

describe("stripeKeyMode", () => {
  it("detects test and live prefixes without hardcoding a key", () => {
    assert.equal(stripeKeyMode("sk_test_123"), "test");
    assert.equal(stripeKeyMode("sk_live_123"), "live");
    assert.equal(stripeKeyMode("rk_test_123"), "unknown");
  });
});

describe("resolveCheckoutOrigin", () => {
  it("uses the public www shop on Vercel production", () => {
    assert.equal(
      resolveCheckoutOrigin(
        { VERCEL_ENV: "production", VERCEL_URL: "top-250-website-ashy.vercel.app" },
        "https://top-250-website-ashy.vercel.app",
      ),
      PUBLIC_SHOP_ORIGIN,
    );
  });

  it("uses the preview / local request host otherwise", () => {
    assert.equal(
      resolveCheckoutOrigin(
        { VERCEL_ENV: "preview", VERCEL_URL: "top-250-website-git-stripe.vercel.app" },
        "https://top-250-website-git-stripe.vercel.app",
      ),
      "https://top-250-website-git-stripe.vercel.app",
    );
    assert.equal(resolveCheckoutOrigin({}, undefined), "http://localhost:8080");
  });
});

describe("originFromRequestHeaders", () => {
  it("prefers forwarded host and proto", () => {
    const headers = new Headers({
      "x-forwarded-host": "preview.example.com",
      "x-forwarded-proto": "https",
      host: "localhost:8080",
    });
    assert.equal(originFromRequestHeaders(headers), "https://preview.example.com");
  });
});

describe("checkoutReturnUrls", () => {
  it("includes the Stripe session placeholder and cancel flag", () => {
    const urls = checkoutReturnUrls("https://www.top-250.com/");
    assert.equal(
      urls.successUrl,
      "https://www.top-250.com/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    );
    assert.equal(urls.cancelUrl, "https://www.top-250.com/checkout?canceled=1");
  });
});

describe("publicImageForStripe", () => {
  it("only sends HTTPS images Stripe can fetch", () => {
    assert.equal(
      publicImageForStripe("/products/mouse.jpg", "https://www.top-250.com"),
      "https://www.top-250.com/products/mouse.jpg",
    );
    assert.equal(publicImageForStripe("/products/mouse.jpg", "http://localhost:8080"), undefined);
    assert.equal(publicImageForStripe("data:image/png;base64,xx", "https://www.top-250.com"), undefined);
    assert.equal(
      publicImageForStripe("https://blob.vercel-storage.com/pad.jpg", "https://www.top-250.com"),
      "https://blob.vercel-storage.com/pad.jpg",
    );
  });
});

describe("quoteCartLines", () => {
  it("uses catalog cents and SKUs, not client-supplied prices", () => {
    const quoted = quoteCartLines([mouse], [{ productId: "mouse", qty: 2 }]);
    assert.equal(quoted.subtotalCents, 11998);
    assert.equal(quoted.lines[0].productId, "mouse");
    assert.equal(quoted.lines[0].priceCents, 5999);
    assert.equal(quoted.lines[0].name, "TOP-250 Strike Mouse");
  });

  it("rejects empty carts and oversell", () => {
    assert.throws(() => quoteCartLines([mouse], []), /empty/i);
    assert.throws(() => quoteCartLines([mouse], [{ productId: "mouse", qty: 99 }]), /only has 24/);
    assert.throws(
      () => quoteCartLines([{ ...mouse, active: false }], [{ productId: "mouse", qty: 1 }]),
      /no longer available/,
    );
  });
});

describe("buildStripeLineItems", () => {
  it("adds catalog lines plus shipping with SKU metadata", () => {
    const quoted = quoteCartLines([mouse], [{ productId: "mouse", qty: 1 }]);
    const items = buildStripeLineItems(
      quoted.lines,
      { method: "USPS", cents: 825 },
      "https://www.top-250.com",
    );
    assert.equal(items.length, 2);
    assert.equal(items[0].price_data.unit_amount, 5999);
    assert.equal(items[0].quantity, 1);
    assert.equal(items[0].price_data.product_data.metadata.sku, "mouse");
    assert.equal(items[0].price_data.product_data.images?.[0], "https://www.top-250.com/products/mouse.jpg");
    assert.equal(items[1].price_data.unit_amount, 825);
    assert.equal(items[1].price_data.product_data.metadata.sku, "shipping-usps");
  });
});

describe("checkout metadata and payment gates", () => {
  it("stores order id and SKUs for later tracking", () => {
    assert.deepEqual(checkoutMetadata({ orderId: 42, userId: "usr_1", skus: ["mouse", "hub"] }), {
      order_id: "42",
      user_id: "usr_1",
      skus: "mouse,hub",
    });
  });

  it("only treats Stripe payment_status paid as paid", () => {
    assert.equal(stripeSessionPaid({ payment_status: "paid" }), true);
    assert.equal(stripeSessionPaid({ payment_status: "unpaid" }), false);
    assert.equal(shouldApplyPayment({ paid_at: null }), true);
    assert.equal(shouldApplyPayment({ paid_at: "2026-09-05T00:00:00Z" }), false);
    assert.equal(shouldApplyPayment(null), false);
  });
});
