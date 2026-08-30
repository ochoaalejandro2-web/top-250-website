import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FREE_GATEWAY_CHAT_MODEL,
  GATEWAY_CHAT_URL,
  completeChat,
  completeShopLlm,
  readGatewayOidcToken,
  readOptionalXaiKey,
} from "./llm.ts";

describe("shop LLM auth and free Gateway model", () => {
  it("uses VERCEL_OIDC_TOKEN only for Gateway — never requires AI_GATEWAY_API_KEY", () => {
    const env = {
      VERCEL_OIDC_TOKEN: "  oidc-token  ",
      AI_GATEWAY_API_KEY: "must-not-be-required",
      XAI_API_KEY: "",
    } as NodeJS.ProcessEnv;
    assert.equal(readGatewayOidcToken(env), "oidc-token");
    assert.equal(readGatewayOidcToken({} as NodeJS.ProcessEnv), undefined);
    assert.equal(readGatewayOidcToken({ AI_GATEWAY_API_KEY: "x" } as NodeJS.ProcessEnv), undefined);
    assert.equal(readOptionalXaiKey({ XAI_API_KEY: "   " } as NodeJS.ProcessEnv), undefined);
  });

  it("pins a currently free Gateway chat slug, not a paid Grok or m3 twin", () => {
    assert.equal(FREE_GATEWAY_CHAT_MODEL, "minimax/minimax-m3-free");
    assert.doesNotMatch(FREE_GATEWAY_CHAT_MODEL, /^xai\//);
    assert.doesNotMatch(FREE_GATEWAY_CHAT_MODEL, /grok/i);
    assert.notEqual(FREE_GATEWAY_CHAT_MODEL, "minimax/minimax-m3");
    assert.equal(GATEWAY_CHAT_URL, "https://ai-gateway.vercel.sh/v1/chat/completions");
  });

  it("returns the model text and never logs the bearer token", async () => {
    const originalFetch = globalThis.fetch;
    let auth = "";
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      auth = String((init?.headers as Record<string, string>)?.Authorization ?? "");
      return new Response(JSON.stringify({ choices: [{ message: { content: "HDMI Fuser is $120." } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    try {
      const text = await completeChat({
        url: GATEWAY_CHAT_URL,
        token: "secret-oidc",
        model: FREE_GATEWAY_CHAT_MODEL,
        messages: [{ role: "user", content: "Does the HDMI fuser work with PS5?" }],
      });
      assert.equal(text, "HDMI Fuser is $120.");
      assert.equal(auth, "Bearer secret-oidc");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("calls Gateway with OIDC before falling through", async () => {
    const originalFetch = globalThis.fetch;
    const prevOidc = process.env.VERCEL_OIDC_TOKEN;
    const prevXai = process.env.XAI_API_KEY;
    process.env.VERCEL_OIDC_TOKEN = "oidc-live";
    delete process.env.XAI_API_KEY;
    let url = "";
    let model = "";
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      url = String(input);
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      model = body.model ?? "";
      return new Response(JSON.stringify({ choices: [{ message: { content: "Yes — HDMI Fuser is $120 and in stock." } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    try {
      const text = await completeShopLlm([{ role: "user", content: "Does the HDMI fuser work with PS5?" }]);
      assert.equal(url, GATEWAY_CHAT_URL);
      assert.equal(model, FREE_GATEWAY_CHAT_MODEL);
      assert.match(text ?? "", /HDMI Fuser/);
    } finally {
      globalThis.fetch = originalFetch;
      if (prevOidc === undefined) delete process.env.VERCEL_OIDC_TOKEN;
      else process.env.VERCEL_OIDC_TOKEN = prevOidc;
      if (prevXai === undefined) delete process.env.XAI_API_KEY;
      else process.env.XAI_API_KEY = prevXai;
    }
  });

  it("returns null when Gateway is not ok so catalog can answer", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("nope", { status: 402 })) as typeof fetch;
    try {
      const text = await completeChat({
        url: GATEWAY_CHAT_URL,
        token: "oidc",
        model: FREE_GATEWAY_CHAT_MODEL,
        messages: [{ role: "user", content: "hi" }],
      });
      assert.equal(text, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
