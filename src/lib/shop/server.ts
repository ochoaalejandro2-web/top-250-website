import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { isBlockedCatalogItem, slugFromName } from "./catalog";
import { estimateShippingCents, type Carrier } from "./shipping";

export type Product = {
  id: string;
  name: string;
  fullName: string;
  tag: string;
  description: string;
  priceCents: number;
  weightLb: number;
  imageUrl: string;
  stock: number;
  active: boolean;
  sortOrder: number;
};

export type OrderSummary = {
  id: number;
  customerName: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  shippingMethod: string;
  shippingCents: number;
  subtotalCents: number;
  totalCents: number;
  status: string;
  notes: string | null;
  createdAt: string;
  items: { productId: string; name: string; qty: number; priceCents: number }[];
};

type ProductRow = {
  id: string;
  name: string;
  full_name: string;
  tag: string;
  description: string;
  price_cents: number;
  weight_lb: string | number;
  image_url: string;
  stock: number;
  active: boolean;
  sort_order: number;
};

function mapProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    tag: r.tag,
    description: r.description,
    priceCents: Number(r.price_cents),
    weightLb: Number(r.weight_lb),
    imageUrl: r.image_url,
    stock: Number(r.stock),
    active: Boolean(r.active),
    sortOrder: Number(r.sort_order),
  };
}

async function ensureProfile(userId: string, email?: string | null, name?: string | null) {
  const sql = await getSql();
  const existing = await sql<{ user_id: string }>`select user_id from profiles where user_id = ${userId}`;
  if (existing.length) {
    if (email || name) {
      await sql`update profiles set email = coalesce(${email ?? null}, email), display_name = coalesce(${name ?? null}, display_name) where user_id = ${userId}`;
    }
    return;
  }
  await sql`insert into profiles (user_id, email, display_name, is_admin) values (${userId}, ${email ?? null}, ${name ?? null}, false)`;
}

async function requireAdmin(userId: string) {
  await ensureProfile(userId);
  const sql = await getSql();
  const rows = await sql<{ is_admin: boolean }>`select is_admin from profiles where user_id = ${userId}`;
  if (!rows[0]?.is_admin) throw new Error("Admin only");
}

function publicProduct(p: Product) {
  return p.active && !isBlockedCatalogItem(p);
}

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<ProductRow>`select * from products where active = true order by sort_order, name`;
  return rows.map(mapProduct).filter(publicProduct);
});

export const getProduct = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const sql = await getSql();
    const rows = await sql<ProductRow>`select * from products where id = ${id}`;
    const product = rows[0] ? mapProduct(rows[0]) : null;
    if (!product || !publicProduct(product)) return null;
    return product;
  });

export const quoteShipping = createServerFn({ method: "POST" })
  .validator((input: { zip: string; weightLb: number }) => input)
  .handler(async ({ data }) => estimateShippingCents(data.zip, data.weightLb));

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const u = await getSessionUser();
    await ensureProfile(context.userId, u?.email);
    const sql = await getSql();
    const rows = await sql<{
      user_id: string;
      email: string | null;
      display_name: string | null;
      is_admin: boolean;
    }>`select user_id, email, display_name, is_admin from profiles where user_id = ${context.userId}`;
    return rows[0] ?? { user_id: context.userId, email: u?.email ?? null, display_name: null, is_admin: false };
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
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
    }) => input,
  )
  .handler(async ({ context, data }) => {
    if (!data.items?.length) throw new Error("Cart is empty");
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const u = await getSessionUser();
    await ensureProfile(context.userId, data.email || u?.email, data.name);
    const sql = await getSql();
    const products = await sql<ProductRow>`select * from products`;
    const wanted = new Set(data.items.map((i) => i.productId));
    const byId = new Map(
      products.filter((p) => wanted.has(p.id)).map((p) => [p.id, mapProduct(p)]),
    );
    let weight = 0;
    let subtotal = 0;
    const lines: { productId: string; name: string; qty: number; priceCents: number }[] = [];
    for (const item of data.items) {
      const p = byId.get(item.productId);
      if (!p || !p.active) throw new Error("A product is no longer available");
      if (item.qty < 1) continue;
      if (p.stock < item.qty) throw new Error(`${p.name} only has ${p.stock} in stock`);
      weight += p.weightLb * item.qty;
      subtotal += p.priceCents * item.qty;
      lines.push({ productId: p.id, name: p.fullName, qty: item.qty, priceCents: p.priceCents });
    }
    if (!lines.length) throw new Error("Cart is empty");
    const quote = estimateShippingCents(data.zip, weight);
    const method: Carrier = data.shippingMethod === "UPS" ? "UPS" : "USPS";
    const shipping = quote[method];
    const total = subtotal + shipping;

    const inserted = await sql<{ id: number }>`
      insert into orders (
        user_id, customer_name, email, phone, address, city, state, zip,
        shipping_method, shipping_cents, subtotal_cents, total_cents, status, notes
      ) values (
        ${context.userId}, ${data.name.trim()}, ${data.email.trim()}, ${data.phone?.trim() || null},
        ${data.address.trim()}, ${data.city.trim()}, ${data.state.trim().toUpperCase()}, ${data.zip.trim()},
        ${method}, ${shipping}, ${subtotal}, ${total}, 'pending', ${data.notes?.trim() || null}
      ) returning id`;
    const orderId = inserted[0].id;
    for (const line of lines) {
      await sql`insert into order_items (order_id, product_id, name, qty, price_cents)
        values (${orderId}, ${line.productId}, ${line.name}, ${line.qty}, ${line.priceCents})`;
      await sql`update products set stock = stock - ${line.qty} where id = ${line.productId}`;
    }
    return { orderId, totalCents: total, shippingCents: shipping, method };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const orders = await sql<{
      id: number;
      customer_name: string;
      email: string;
      phone: string | null;
      address: string;
      city: string;
      state: string;
      zip: string;
      shipping_method: string;
      shipping_cents: number;
      subtotal_cents: number;
      total_cents: number;
      status: string;
      notes: string | null;
      created_at: string;
    }>`select * from orders where user_id = ${context.userId} order by created_at desc`;
    return hydrateOrders(orders);
  });

export const listAllOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const orders = await sql<{
      id: number;
      customer_name: string;
      email: string;
      phone: string | null;
      address: string;
      city: string;
      state: string;
      zip: string;
      shipping_method: string;
      shipping_cents: number;
      subtotal_cents: number;
      total_cents: number;
      status: string;
      notes: string | null;
      created_at: string;
    }>`select * from orders order by created_at desc`;
    return hydrateOrders(orders);
  });

async function hydrateOrders(
  orders: {
    id: number;
    customer_name: string;
    email: string;
    phone: string | null;
    address: string;
    city: string;
    state: string;
    zip: string;
    shipping_method: string;
    shipping_cents: number;
    subtotal_cents: number;
    total_cents: number;
    status: string;
    notes: string | null;
    created_at: string;
  }[],
): Promise<OrderSummary[]> {
  if (!orders.length) return [];
  const sql = await getSql();
  const ids = orders.map((o) => o.id);
  const items = await sql<{
    order_id: number;
    product_id: string;
    name: string;
    qty: number;
    price_cents: number;
  }>`select order_id, product_id, name, qty, price_cents from order_items`;
  const idSet = new Set(ids);
  const byOrder = new Map<number, OrderSummary["items"]>();
  for (const it of items) {
    if (!idSet.has(it.order_id)) continue;
    const list = byOrder.get(it.order_id) ?? [];
    list.push({
      productId: it.product_id,
      name: it.name,
      qty: Number(it.qty),
      priceCents: Number(it.price_cents),
    });
    byOrder.set(it.order_id, list);
  }
  return orders.map((o) => ({
    id: o.id,
    customerName: o.customer_name,
    email: o.email,
    phone: o.phone,
    address: o.address,
    city: o.city,
    state: o.state,
    zip: o.zip,
    shippingMethod: o.shipping_method,
    shippingCents: Number(o.shipping_cents),
    subtotalCents: Number(o.subtotal_cents),
    totalCents: Number(o.total_cents),
    status: o.status,
    notes: o.notes,
    createdAt: o.created_at,
    items: byOrder.get(o.id) ?? [],
  }));
}

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; status: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const allowed = ["pending", "packed", "shipped", "cancelled"];
    if (!allowed.includes(data.status)) throw new Error("Invalid status");
    const sql = await getSql();
    await sql`update orders set status = ${data.status} where id = ${data.id}`;
    return { ok: true };
  });

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<ProductRow>`select * from products order by sort_order, name`;
    return rows.map(mapProduct);
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      id: string;
      name: string;
      fullName: string;
      tag: string;
      description: string;
      priceCents: number;
      weightLb: number;
      imageUrl: string;
      stock: number;
      active: boolean;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const id = (data.id.trim() || slugFromName(data.name)).toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!id) throw new Error("Product id required");
    const blocked = isBlockedCatalogItem({
      id,
      name: data.name,
      fullName: data.fullName,
      description: data.description,
      tag: data.tag,
    });
    if (blocked) {
      throw new Error("This shop only lists gaming accessories — DMA / firmware hardware is not allowed.");
    }
    const sql = await getSql();
    await sql`
      insert into products (id, name, full_name, tag, description, price_cents, weight_lb, image_url, stock, active)
      values (
        ${id}, ${data.name.trim()}, ${data.fullName.trim() || data.name.trim()}, ${data.tag.trim()}, ${data.description.trim()},
        ${Math.round(data.priceCents)}, ${data.weightLb}, ${data.imageUrl.trim()}, ${Math.round(data.stock)}, ${data.active}
      )
      on conflict (id) do update set
        name = excluded.name,
        full_name = excluded.full_name,
        tag = excluded.tag,
        description = excluded.description,
        price_cents = excluded.price_cents,
        weight_lb = excluded.weight_lb,
        image_url = excluded.image_url,
        stock = excluded.stock,
        active = excluded.active`;
    return { ok: true, id };
  });

export const removeProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await sql`update products set active = false where id = ${id}`;
    return { ok: true };
  });

export const uploadProductPhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { filename: string; contentType: string; dataBase64: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const mime = data.contentType.trim().toLowerCase();
    if (!mime.startsWith("image/")) throw new Error("Please upload an image file");
    const bytes = Buffer.from(data.dataBase64, "base64");
    if (!bytes.length) throw new Error("Empty file");
    if (bytes.length > 6_000_000) throw new Error("Image is too large (max 6 MB)");

    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (token) {
      const { put } = await import("@vercel/blob");
      const safe = (data.filename || "photo").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
      const blob = await put(`products/${Date.now()}-${safe}`, bytes, {
        access: "public",
        token,
        contentType: mime,
        addRandomSuffix: true,
      });
      return { url: blob.url, storage: "vercel-blob" as const };
    }

    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`insert into product_photos (id, mime, data_base64)
      values (${id}, ${mime}, ${data.dataBase64})`;
    return { url: `/api/product-image/${id}`, storage: "postgres" as const };
  });

export const askShopAi = createServerFn({ method: "POST" })
  .validator((input: { question: string; history?: { role: "user" | "assistant"; content: string }[] }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "The shop assistant is unavailable right now." };
    const sql = await getSql();
    const rows = await sql<ProductRow>`select * from products where active = true order by sort_order`;
    const catalog = rows
      .map(mapProduct)
      .filter(publicProduct)
      .map(
        (p) =>
          `- ${p.fullName} ($${p.priceCents / 100}): ${p.description} Weight ${p.weightLb} lb. Stock ${p.stock}.`,
      )
      .join("\n");
    const history = (data.history ?? []).slice(-6);
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 350,
        messages: [
          {
            role: "system",
            content: `You are the TOP-250 shop assistant. TOP-250 is a small gaming-accessories shop in Phoenix, Arizona. Shipping is USPS or UPS from Phoenix; estimates use ZIP + package weight (USPS cheaper, UPS faster ground). We do not currently offer FedEx or in-store pickup. Be concise, friendly, and accurate. If you do not know, say so. Never invent discounts or stock that is not listed.

            Catalog (gaming accessories only — never mention DMA cards, FPGA boards, firmware, or cheat hardware):
${catalog}

Checkout: customers sign in (email/password, Google, or X), enter a US shipping address, pick USPS or UPS, and place the order. They can contact the shop with a form before buying. The shop owner manages orders in the admin dashboard. Reply in the customer's language when they write in Spanish.`,
          },
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: data.question.slice(0, 800) },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: "Assistant could not answer just now." };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { ok: true as const, text: body.choices?.[0]?.message?.content ?? "" };
  });

export const submitContact = createServerFn({ method: "POST" })
  .validator((input: { name: string; email: string; phone?: string; topic: string; message: string }) => input)
  .handler(async ({ data }) => {
    const name = data.name.trim();
    const email = data.email.trim();
    const message = data.message.trim();
    if (name.length < 2) throw new Error("Name is required");
    if (!email.includes("@")) throw new Error("Valid email is required");
    if (message.length < 8) throw new Error("Please write a bit more in your message");
    const sql = await getSql();
    await sql`insert into contact_messages (name, email, phone, topic, message)
      values (
        ${name},
        ${email},
        ${data.phone?.trim() || null},
        ${data.topic.trim() || "General"},
        ${message}
      )`;
    return { ok: true };
  });

export const listContactMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    return sql<{
      id: number;
      name: string;
      email: string;
      phone: string | null;
      topic: string;
      message: string;
      created_at: string;
    }>`select * from contact_messages order by created_at desc`;
  });

export const becomeStoreAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code?: string }) => input)
  .handler(async ({ context, data }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const u = await getSessionUser();
    await ensureProfile(context.userId, u?.email);
    const sql = await getSql();
    const admins = await sql<{ c: number }>`select count(*)::int as c from profiles where is_admin = true`;
    const settings = await sql<{ value: string }>`select value from store_settings where key = 'admin_code'`;
    const expected = (settings[0]?.value ?? "TOP-250").trim().toUpperCase();
    const noAdmin = Number(admins[0]?.c ?? 0) === 0;
    const codeOk = (data.code ?? "").trim().toUpperCase() === expected && expected.length > 0;
    if (!noAdmin && !codeOk) {
      throw new Error("Need the store access code to become admin");
    }
    await sql`update profiles set is_admin = true where user_id = ${context.userId}`;
    return { ok: true, is_admin: true };
  });

export const getStoreSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{ key: string; value: string }>`select key, value from store_settings`;
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return { adminCode: map.admin_code ?? "TOP-250" };
  });

export const saveStoreSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { adminCode: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const code = data.adminCode.trim();
    if (code.length < 4) throw new Error("Access code must be at least 4 characters");
    const sql = await getSql();
    await sql`insert into store_settings (key, value) values ('admin_code', ${code})
      on conflict (key) do update set value = excluded.value`;
    return { ok: true };
  });
