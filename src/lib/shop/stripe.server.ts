import Stripe from "stripe";
import { assertStripeSecret, readStripeEnv } from "./checkout.ts";

let cached: { key: string; client: Stripe } | null = null;

/** Server-only Stripe client. Secret key never leaves this module. */
export function getStripe(env: NodeJS.ProcessEnv = process.env): Stripe {
  const key = assertStripeSecret(readStripeEnv(env).secretKey);
  if (cached?.key === key) return cached.client;
  const client = new Stripe(key);
  cached = { key, client };
  return client;
}

export function resetStripeClientCache(): void {
  cached = null;
}
