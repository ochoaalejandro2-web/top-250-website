import type Stripe from "stripe";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { estimateShippingCents, type Carrier } from "./shipping";
import {
  AWAITING_PAYMENT_STATUS,
  PAID_FULFILLMENT_STATUS,
  assertStripeSecret,
  buildStripeLineItems,
  checkoutMetadata,
  checkoutReturnUrls,
  originFromRequestHeaders,
  quoteCartLines,
  readStripeEnv,
  resolveCheckoutOrigin,
  stripeKeyMode,
  stripeSessionPaid,
  type CatalogProduct,
} from "./checkout";
import { getStripe } from "./stripe.server";

type ProductRow = {
  id: string;
  name: string;
  full_name: string;
  price_cents: number;
  weight_lb: string | number;
  image_url: string;
  stock: number;
  active: boolean;
};

function mapCatalog(row: ProductRow): CatalogProduct {
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    priceCents: Number(row.price_cents),
    weightLb: Number(row.weight_lb),
    imageUrl: row.image_url,
    stock: Number(row.stock),
    active: Boolean(row.active),
  };
}

export type StartCheckoutInput = {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  shippingMethod: Carrier;
  notes?: string;
  items: { productId: string; qty: number }[];
};

export type CheckoutConfirmation = {
  orderId: number;
  status: string;
  totalCents: number;
  shippingCents: number;
  shippingMethod: string;
  email: string;
  city: string;
  state: string;
  zip: string;
  paid: boolean;
  testMode: boolean;
  items: { productId: string; name: string; qty: number; priceCents: number }[];
};

function currentCheckoutOrigin(): string {
  const request = getRequest();
  const requestOrigin = request
    ? originFromRequestHeaders(request.headers, request.url)
    : undefined;
  return resolveCheckoutOrigin(process.env, requestOrigin);
}

export async function startStripeCheckout(data: StartCheckoutInput): Promise<{
  orderId: number;
  checkoutUrl: string;
  totalCents: number;
  shippingCents: number;
  method: Carrier;
  testMode: boolean;
}> {
  const secret = assertStripeSecret(readStripeEnv(process.env).secretKey);
  if (!data.items?.length) throw new Error("Cart is empty");
  const name = data.name.trim();
  const email = data.email.trim();
  const zip = data.zip.replace(/\D/g, "");
  if (name.length < 2) throw new Error("Name is required");
  if (!email.includes("@")) throw new Error("Valid email is required");
  if (zip.length < 5) throw new Error("ZIP is required");

  const sql = await getSql();
  const products = (await sql<ProductRow>`select * from products`).map(mapCatalog);
  const quoted = quoteCartLines(products, data.items);
  const method: Carrier = data.shippingMethod === "UPS" ? "UPS" : "USPS";
  const shipping = estimateShippingCents(zip, quoted.weightLb)[method];
  const total = quoted.subtotalCents + shipping;
  const origin = currentCheckoutOrigin();

  const inserted = await sql<{ id: number }>`
    insert into orders (
      user_id, customer_name, email, phone, address, city, state, zip,
      shipping_method, shipping_cents, subtotal_cents, total_cents, status, notes
    ) values (
      ${data.userId}, ${name}, ${email}, ${data.phone?.trim() || null},
      ${data.address.trim()}, ${data.city.trim()}, ${data.state.trim().toUpperCase()}, ${data.zip.trim()},
      ${method}, ${shipping}, ${quoted.subtotalCents}, ${total}, ${AWAITING_PAYMENT_STATUS},
      ${data.notes?.trim() || null}
    ) returning id`;
  const orderId = inserted[0].id;
  for (const line of quoted.lines) {
    await sql`insert into order_items (order_id, product_id, name, qty, price_cents)
      values (${orderId}, ${line.productId}, ${line.name}, ${line.qty}, ${line.priceCents})`;
  }

  const metadata = checkoutMetadata({
    orderId,
    userId: data.userId,
    skus: quoted.lines.map((line) => line.productId),
  });
  const { successUrl, cancelUrl } = checkoutReturnUrls(origin);
  const stripe = getStripe();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      client_reference_id: String(orderId),
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: buildStripeLineItems(quoted.lines, { method, cents: shipping }, origin),
      metadata,
      payment_intent_data: {
        metadata,
        description: `TOP-250 order #${orderId}`,
      },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    await sql`update orders set stripe_checkout_session_id = ${session.id} where id = ${orderId}`;
    return {
      orderId,
      checkoutUrl: session.url,
      totalCents: total,
      shippingCents: shipping,
      method,
      testMode: stripeKeyMode(secret) === "test",
    };
  } catch (err) {
    await sql`update orders set status = 'cancelled', notes = 'Card checkout session failed'
      where id = ${orderId} and paid_at is null`;
    throw err instanceof Error ? err : new Error("Could not start card checkout");
  }
}

async function fulfillPaidSession(session: Stripe.Checkout.Session): Promise<{
  orderId?: number;
  fulfilled: boolean;
  already?: boolean;
  reason?: string;
}> {
  if (!stripeSessionPaid(session)) return { fulfilled: false, reason: "unpaid" };
  const sql = await getSql();
  const sessionId = session.id;
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  const orderIdFromMeta = Number(session.metadata?.order_id ?? session.client_reference_id ?? 0);

  let rows = await sql<{ id: number; paid_at: string | null }>`
    select id, paid_at from orders where stripe_checkout_session_id = ${sessionId} limit 1`;
  if (!rows[0] && orderIdFromMeta > 0) {
    rows = await sql<{ id: number; paid_at: string | null }>`
      select id, paid_at from orders where id = ${orderIdFromMeta} limit 1`;
  }
  const order = rows[0];
  if (!order) {
    console.error("[stripe] paid session has no matching order", {
      sessionId,
      orderIdFromMeta: orderIdFromMeta || null,
    });
    return { fulfilled: false, reason: "missing-order" };
  }
  if (order.paid_at) return { orderId: order.id, fulfilled: true, already: true };

  const updated = await sql<{ id: number }>`
    update orders
    set status = ${PAID_FULFILLMENT_STATUS},
        paid_at = now(),
        stripe_payment_intent_id = ${paymentIntent},
        stripe_checkout_session_id = coalesce(stripe_checkout_session_id, ${sessionId})
    where id = ${order.id} and paid_at is null
    returning id`;
  if (!updated[0]) return { orderId: order.id, fulfilled: true, already: true };

  const items = await sql<{ product_id: string; qty: number }>`
    select product_id, qty from order_items where order_id = ${order.id}`;
  for (const item of items) {
    await sql`update products set stock = stock - ${item.qty} where id = ${item.product_id}`;
  }
  return { orderId: order.id, fulfilled: true, already: false };
}

async function loadConfirmation(orderId: number, testMode: boolean): Promise<CheckoutConfirmation> {
  const sql = await getSql();
  const orders = await sql<{
    id: number;
    status: string;
    total_cents: number;
    shipping_cents: number;
    shipping_method: string;
    email: string;
    city: string;
    state: string;
    zip: string;
    paid_at: string | null;
  }>`select id, status, total_cents, shipping_cents, shipping_method, email, city, state, zip, paid_at
    from orders where id = ${orderId}`;
  const order = orders[0];
  if (!order) throw new Error("Order not found");
  const items = await sql<{
    product_id: string;
    name: string;
    qty: number;
    price_cents: number;
  }>`select product_id, name, qty, price_cents from order_items where order_id = ${orderId}`;
  return {
    orderId: order.id,
    status: order.status,
    totalCents: Number(order.total_cents),
    shippingCents: Number(order.shipping_cents),
    shippingMethod: order.shipping_method,
    email: order.email,
    city: order.city,
    state: order.state,
    zip: order.zip,
    paid: Boolean(order.paid_at),
    testMode,
    items: items.map((item) => ({
      productId: item.product_id,
      name: item.name,
      qty: Number(item.qty),
      priceCents: Number(item.price_cents),
    })),
  };
}

export async function confirmPaidCheckout(sessionId: string): Promise<CheckoutConfirmation> {
  const id = sessionId.trim();
  if (!id.startsWith("cs_")) throw new Error("Missing checkout session");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(id);
  if (!stripeSessionPaid(session)) {
    throw new Error("Payment is not complete yet.");
  }
  const result = await fulfillPaidSession(session);
  if (!result.orderId) throw new Error("We could not match that payment to an order.");
  return loadConfirmation(result.orderId, session.livemode === false);
}

export async function handleStripeWebhook(request: Request): Promise<Response> {
  const { webhookSecret } = readStripeEnv(process.env);
  if (!webhookSecret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret is not configured", { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature", { status: 400 });

  const raw = await request.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch {
    console.error("[stripe] webhook signature failed");
    return new Response("Invalid signature", { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const result = await fulfillPaidSession(session);
    console.info("[stripe] webhook", {
      type: event.type,
      sessionId: session.id,
      orderId: result.orderId ?? null,
      already: result.already ?? false,
      livemode: event.livemode,
    });
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.info("[stripe] checkout session expired", {
      sessionId: session.id,
      livemode: event.livemode,
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
