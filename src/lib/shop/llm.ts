/**
 * Live shop-assistant LLM calls.
 *
 * Production has no XAI_API_KEY (Alex skipped the xAI bill). Vercel injects
 * VERCEL_OIDC_TOKEN on the top-250-website project when OIDC is enabled.
 * Authenticate to AI Gateway with that token only — do not require
 * AI_GATEWAY_API_KEY or XAI_API_KEY.
 *
 * Grok slugs on Gateway are paid. Free chat models are taken from
 * GET https://ai-gateway.vercel.sh/v1/models (2026-08-30): input/output $0.
 * The paid twin `minimax/minimax-m3` is not used.
 */
export const GATEWAY_CHAT_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
export const XAI_CHAT_URL = "https://api.x.ai/v1/chat/completions";

/** Confirmed $0 language model from today's Gateway catalog. */
export const FREE_GATEWAY_CHAT_MODEL = "minimax/minimax-m3-free";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function readGatewayOidcToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const token = env.VERCEL_OIDC_TOKEN?.trim();
  return token || undefined;
}

export function readOptionalXaiKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const key = env.XAI_API_KEY?.trim();
  return key || undefined;
}

export async function completeChat(opts: {
  url: string;
  token: string;
  model: string;
  messages: ChatMessage[];
}): Promise<string | null> {
  const res = await fetch(opts.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.token}`,
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 350,
      messages: opts.messages,
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim();
  return text || null;
}

/** Gateway via OIDC first, optional xAI if a key happens to exist, else null. */
export async function completeShopLlm(messages: ChatMessage[]): Promise<string | null> {
  const oidc = readGatewayOidcToken();
  if (oidc) {
    const text = await completeChat({
      url: GATEWAY_CHAT_URL,
      token: oidc,
      model: FREE_GATEWAY_CHAT_MODEL,
      messages,
    });
    if (text) return text;
  }

  const xai = readOptionalXaiKey();
  if (xai) {
    const text = await completeChat({
      url: XAI_CHAT_URL,
      token: xai,
      model: "grok-4.5",
      messages,
    });
    if (text) return text;
  }

  return null;
}
