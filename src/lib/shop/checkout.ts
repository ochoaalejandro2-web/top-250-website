import { LOCAL_DEV_ORIGINS, PUBLIC_SHOP_ORIGIN, originFromHostOrUrl } from "../auth/origins.ts";
import type { Carrier } from "./shipping.ts";

/** Order is created before Stripe; stock is reserved only after payment. */
export const AWAITING_PAYMENT_STATUS = "awaiting_payment";
/** Paid and waiting to be packed — same meaning as pre-Stripe `pending`. */
export const PAID_FULFILLMENT_STATUS = "pending";

export type CatalogProduct = {
  id: string;
  name: string;
  fullName: string;
  priceCents: number;
  weightLb: number;
  imageUrl: string;
  stock: number;
  active: boolean;
};

export type QuotedLine = {
  productId: string;
  name: string;
  qty: number;
  priceCents: number;
  imageUrl: string;
};

export type CheckoutHostEnv = {
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
};

export type StripeEnv = {
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
};

function emptyToUndef(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function readStripeEnv(env: Record<string, string | undefined>): StripeEnv {
  return {
    secretKey: emptyToUndef(env.STRIPE_SECRET_KEY),
    publishableKey: emptyToUndef(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    webhookSecret: emptyToUndef(env.STRIPE_WEBHOOK_SECRET),
  };
}

export function stripeKeyMode(secretKey: string): "test" | "live" | "unknown" {
  if (secretKey.startsWith("sk_test_")) return "test";
  if (secretKey.startsWith("sk_live_")) return "live";
  return "unknown";
}

export function assertStripeSecret(secretKey: string | undefined): string {
  if (!secretKey) {
    throw new Error("Card checkout is not configured. Set STRIPE_SECRET_KEY on the server.");
  }
  if (secretKey.startsWith("pk_")) {
    throw new Error(
      "STRIPE_SECRET_KEY must be a secret key (sk_test_… or sk_live_…), not the publishable key.",
    );
  }
  return secretKey;
}

export function originFromRequestHeaders(
  headers: { get(name: string): string | null },
  fallbackUrl?: string,
): string | undefined {
  const host = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "")
    .split(",")[0]
    ?.trim();
  if (host) {
    const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const proto =
      forwarded ||
      (host.includes("localhost") || host.startsWith("127.") || host.startsWith("[::1]")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  }
  if (!fallbackUrl) return undefined;
  try {
    return new URL(fallbackUrl).origin;
  } catch {
    return undefined;
  }
}

/** Production always returns customers to www.top-250.com; preview/local use the current host. */
export function resolveCheckoutOrigin(env: CheckoutHostEnv, requestOrigin?: string): string {
  if (env.VERCEL_ENV === "production") return PUBLIC_SHOP_ORIGIN;
  if (requestOrigin) {
    try {
      return new URL(requestOrigin).origin;
    } catch {
      /* ignore malformed */
    }
  }
  return (
    originFromHostOrUrl(env.VERCEL_BRANCH_URL) ||
    originFromHostOrUrl(env.VERCEL_URL) ||
    LOCAL_DEV_ORIGINS[0]
  );
}

export function checkoutReturnUrls(origin: string): { successUrl: string; cancelUrl: string } {
  const base = origin.replace(/\/+$/, "");
  return {
    successUrl: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}/checkout?canceled=1`,
  };
}

/** Stripe only accepts publicly reachable HTTPS images — never data URLs. */
export function publicImageForStripe(
  imageUrl: string | null | undefined,
  origin: string,
): string | undefined {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith("data:")) return undefined;
  if (/^https:\/\//i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith("/") && /^https:\/\//i.test(origin)) {
    return `${origin.replace(/\/+$/, "")}${imageUrl}`;
  }
  return undefined;
}

export function quoteCartLines(
  products: CatalogProduct[],
  items: { productId: string; qty: number }[],
): { lines: QuotedLine[]; weightLb: number; subtotalCents: number } {
  if (!items.length) throw new Error("Cart is empty");
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines: QuotedLine[] = [];
  let weightLb = 0;
  let subtotalCents = 0;
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || !product.active) throw new Error("A product is no longer available");
    const qty = Math.floor(Number(item.qty));
    if (!Number.isFinite(qty) || qty < 1) continue;
    if (product.stock < qty) throw new Error(`${product.name} only has ${product.stock} in stock`);
    weightLb += product.weightLb * qty;
    subtotalCents += product.priceCents * qty;
    lines.push({
      productId: product.id,
      name: product.fullName || product.name,
      qty,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
    });
  }
  if (!lines.length) throw new Error("Cart is empty");
  return { lines, weightLb, subtotalCents };
}

export type StripePriceLine = {
  quantity: number;
  price_data: {
    currency: "usd";
    unit_amount: number;
    product_data: {
      name: string;
      images?: string[];
      metadata: { sku: string };
    };
  };
};

export function buildStripeLineItems(
  lines: QuotedLine[],
  shipping: { method: Carrier; cents: number },
  origin: string,
): StripePriceLine[] {
  const items: StripePriceLine[] = lines.map((line) => {
    const image = publicImageForStripe(line.imageUrl, origin);
    return {
      quantity: line.qty,
      price_data: {
        currency: "usd",
        unit_amount: line.priceCents,
        product_data: {
          name: line.name.slice(0, 250),
          ...(image ? { images: [image] } : {}),
          metadata: { sku: line.productId },
        },
      },
    };
  });
  if (shipping.cents > 0) {
    items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: shipping.cents,
        product_data: {
          name: `Shipping · ${shipping.method}`.slice(0, 250),
          metadata: { sku: `shipping-${shipping.method.toLowerCase()}` },
        },
      },
    });
  }
  return items;
}

export function checkoutMetadata(input: {
  orderId: number;
  userId: string;
  skus: string[];
}): Record<string, string> {
  return {
    order_id: String(input.orderId),
    user_id: input.userId,
    skus: input.skus.join(",").slice(0, 500),
  };
}

export function stripeSessionPaid(session: {
  payment_status?: string | null;
  status?: string | null;
}): boolean {
  return session.payment_status === "paid";
}

export function shouldApplyPayment(row: { paid_at: string | null } | null): boolean {
  return Boolean(row) && !row?.paid_at;
}
