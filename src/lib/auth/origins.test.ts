import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_SHOP_APEX_ORIGIN,
  PUBLIC_SHOP_ORIGIN,
  VERCEL_ALIAS_HOST_PATTERN,
  collectTrustedOrigins,
  originFromHostOrUrl,
  resolveAuthBaseURL,
} from "./origins.ts";

const PREVIEW_HOSTS = ["*.grok-sandbox.com"] as const;

describe("originFromHostOrUrl", () => {
  it("normalizes Vercel hosts and absolute URLs", () => {
    assert.equal(
      originFromHostOrUrl("top-250-website-ashy.vercel.app"),
      "https://top-250-website-ashy.vercel.app",
    );
    assert.equal(
      originFromHostOrUrl("https://top-250.com/"),
      "https://top-250.com",
    );
    assert.equal(originFromHostOrUrl("  "), undefined);
  });
});

describe("collectTrustedOrigins", () => {
  it("trusts www and apex even when BETTER_AUTH_URL is a vercel.app host", () => {
    const origins = collectTrustedOrigins(
      {
        BETTER_AUTH_URL: "https://top-250-website-ashy.vercel.app",
        VERCEL_ENV: "production",
        VERCEL_URL: "top-250-website-ashy.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "www.top-250.com",
      },
      PREVIEW_HOSTS,
    );

    assert.ok(origins.includes(PUBLIC_SHOP_ORIGIN));
    assert.ok(origins.includes(PUBLIC_SHOP_APEX_ORIGIN));
    assert.ok(origins.includes("https://top-250-website-ashy.vercel.app"));
    assert.ok(origins.includes(VERCEL_ALIAS_HOST_PATTERN));
    assert.ok(origins.includes("http://localhost:8080"));
    assert.ok(origins.includes("*.grok-sandbox.com"));
  });

  it("still trusts the shop when BETTER_AUTH_URL is the apex without www", () => {
    const origins = collectTrustedOrigins(
      { BETTER_AUTH_URL: "https://top-250.com", VERCEL_ENV: "production" },
      PREVIEW_HOSTS,
    );
    assert.ok(origins.includes(PUBLIC_SHOP_ORIGIN));
    assert.ok(origins.includes(PUBLIC_SHOP_APEX_ORIGIN));
  });
});

describe("resolveAuthBaseURL", () => {
  it("uses the public www shop in production even if BETTER_AUTH_URL is ashy.vercel.app", () => {
    assert.equal(
      resolveAuthBaseURL(
        {
          BETTER_AUTH_URL: "https://top-250-website-ashy.vercel.app",
          VERCEL_ENV: "production",
        },
        PREVIEW_HOSTS,
      ),
      PUBLIC_SHOP_ORIGIN,
    );
  });

  it("uses the public www shop in production when BETTER_AUTH_URL is the apex", () => {
    assert.equal(
      resolveAuthBaseURL(
        { BETTER_AUTH_URL: "https://top-250.com", VERCEL_ENV: "production" },
        PREVIEW_HOSTS,
      ),
      PUBLIC_SHOP_ORIGIN,
    );
  });

  it("keeps BETTER_AUTH_URL for preview deployments", () => {
    assert.equal(
      resolveAuthBaseURL(
        {
          BETTER_AUTH_URL:
            "https://top-250-website-git-fix-palmiche.vercel.app",
          VERCEL_ENV: "preview",
        },
        PREVIEW_HOSTS,
      ),
      "https://top-250-website-git-fix-palmiche.vercel.app",
    );
  });

  it("uses dynamic preview hosts when BETTER_AUTH_URL is unset", () => {
    const base = resolveAuthBaseURL({}, PREVIEW_HOSTS);
    assert.equal(typeof base, "object");
    assert.ok(base && typeof base === "object");
    assert.ok(base.allowedHosts.includes("*.grok-sandbox.com"));
    assert.ok(base.allowedHosts.includes("www.top-250.com"));
    assert.equal(base.fallback, "http://localhost:8080");
  });
});
