import { BRAND, OWNER } from "./brand.ts";
import { estimateShippingCents } from "./shipping.ts";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export type AssistantProduct = {
  id: string;
  name: string;
  fullName: string;
  tag: string;
  description: string;
  priceCents: number;
  weightLb: number;
  stock: number;
};

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "does",
  "did",
  "work",
  "works",
  "what",
  "how",
  "can",
  "you",
  "are",
  "is",
  "this",
  "that",
  "from",
  "your",
  "our",
  "any",
  "about",
  "have",
  "has",
  "will",
  "just",
  "now",
  "not",
  "yes",
  "use",
  "using",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOP.has(token));
}

function haystack(product: AssistantProduct): string {
  return [product.id, product.name, product.fullName, product.tag, product.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function scoreCatalogMatch(question: string, product: AssistantProduct): number {
  const q = question.toLowerCase();
  const nameBits = tokens(`${product.id} ${product.name} ${product.fullName}`);
  const hay = haystack(product);
  let score = 0;
  for (const token of tokens(question)) {
    if (nameBits.includes(token)) score += 3;
    else if (hay.includes(token)) score += 1;
  }
  if (product.name.length > 2 && q.includes(product.name.toLowerCase())) score += 5;
  if (product.id.length > 2 && q.includes(product.id.toLowerCase())) score += 4;
  return score;
}

function productBlurb(product: AssistantProduct): string {
  const stock = product.stock > 0 ? `${product.stock} in stock` : "currently out of stock";
  const tag = product.tag.trim() ? ` Tags: ${product.tag}.` : "";
  const desc = product.description.trim();
  const sentence = desc ? (desc.endsWith(".") ? desc : `${desc}.`) : "";
  return `${product.fullName || product.name} is ${money(product.priceCents)}. ${sentence}${tag} ${product.weightLb} lb. ${stock}.`;
}

function zipFromQuestion(question: string): string | null {
  const match = question.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1] ?? null;
}

function isShippingQuestion(question: string): boolean {
  return /\b(ship|shipping|usps|ups|delivery|deliver|freight|zip|envio|env[ií]o|env[ií]os)\b/i.test(
    question,
  );
}

function isCompatibilityQuestion(question: string): boolean {
  return /\b(work with|works with|compatible|compatibility|funciona|ps5|ps4|playstation|xbox|switch|console)\b/i.test(
    question,
  );
}

/**
 * Offline TOP-250 shop reply from the live catalog. Used when XAI_API_KEY is
 * missing or the xAI request fails so customers still get a product answer.
 */
export function catalogAssistantReply(question: string, products: AssistantProduct[]): string {
  const asked = question.trim();
  if (!asked) {
    return `I'm the ${BRAND} shop assistant. Ask about a product, price, or USPS / UPS shipping from Phoenix.`;
  }

  const ranked = products
    .map((product) => ({ product, score: scoreCatalogMatch(asked, product) }))
    .filter((row) => row.score >= 3)
    .sort((a, b) => b.score - a.score);
  const primary = ranked[0]?.product;
  const related = ranked[1]?.product;
  const zip = zipFromQuestion(asked);
  const shipping = isShippingQuestion(asked) || Boolean(zip);
  const parts: string[] = [];

  if (primary) {
    parts.push(productBlurb(primary));
    if (isCompatibilityQuestion(asked)) {
      const hay = haystack(primary);
      if (/\bhdmi\b/i.test(`${primary.name} ${primary.fullName} ${hay}`)) {
        parts.push(
          `It is listed as an HDMI accessory. The catalog does not include a confirmed ${BRAND} note for a specific console (including PS5), so treat fit as something to double-check with AO on the contact form if you need a definite yes or no.`,
        );
      } else {
        parts.push(
          `The listing does not confirm console compatibility. AO can confirm fit on the contact form if you need a definite yes or no.`,
        );
      }
    }
    if (related) parts.push(`Also related: ${productBlurb(related)}`);
  } else if (products.length && !shipping) {
    const lineup = products.map((product) => `${product.name} (${money(product.priceCents)})`).join(", ");
    parts.push(
      `I did not match that to one ${BRAND} SKU. Current lineup: ${lineup}. Ask about a product name, or shipping with a ZIP.`,
    );
  }

  if (shipping) {
    if (zip) {
      const weight = primary?.weightLb ?? 1;
      const quote = estimateShippingCents(zip, weight);
      const item = primary ? ` for the ${primary.name} (${primary.weightLb} lb)` : "";
      parts.push(
        `We ship from Phoenix with USPS (usually cheaper) or UPS Ground (usually faster). Estimate to ${zip}${item}: USPS ${money(quote.USPS)}, UPS ${money(quote.UPS)}. Checkout shows the exact quote. We do not offer FedEx or in-store pickup.`,
      );
    } else {
      parts.push(
        `We ship from Phoenix with USPS (usually cheaper) or UPS Ground (usually faster). Send a 5-digit ZIP and I can estimate both. Checkout shows the exact quote. We do not offer FedEx or in-store pickup.`,
      );
    }
  }

  if (!parts.length) {
    parts.push(
      `${BRAND} is a gaming-accessories shop in Phoenix run by ${OWNER}. Ask about a product, price, or USPS / UPS shipping from a ZIP.`,
    );
  }

  return parts.join(" ");
}
