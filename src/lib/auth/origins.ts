/**
 * Better Auth `baseURL` + `trustedOrigins` for the public shop and Vercel aliases.
 *
 * When `BETTER_AUTH_URL` is the only trusted origin (the previous production
 * path), a mismatch with the live host — e.g. env set to `*.vercel.app` or the
 * apex `https://top-250.com` while the visitor is on `https://www.top-250.com` —
 * makes credentialed POSTs fail with FORBIDDEN "Invalid origin".
 *
 * Production always uses the public www shop as `baseURL` so OAuth `redirect_uri`
 * and `__Host-` cookies land on the domain customers actually use. Preview and
 * local keep BETTER_AUTH_URL / dynamic grok-sandbox hosts.
 */

/** Canonical public shop — prefer this over apex or `*.vercel.app`. */
export const PUBLIC_SHOP_ORIGIN = "https://www.top-250.com";
export const PUBLIC_SHOP_APEX_ORIGIN = "https://top-250.com";

export const PUBLIC_SHOP_ORIGINS: readonly string[] = [
  PUBLIC_SHOP_ORIGIN,
  PUBLIC_SHOP_APEX_ORIGIN,
];

/** Local `npm run dev` (port 8080 contract). */
export const LOCAL_DEV_ORIGINS: readonly string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

/** Host wildcard — Better Auth matches Origin's host against this. */
export const VERCEL_ALIAS_HOST_PATTERN = "*.vercel.app";

export type AuthEnv = {
  BETTER_AUTH_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_BRANCH_URL?: string;
};

export type DynamicAuthBaseURL = {
  allowedHosts: string[];
  protocol: "auto";
  fallback: string;
};

export type AuthBaseURL = string | DynamicAuthBaseURL;

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** `https://host` from a Vercel host or already-absolute URL. */
export function originFromHostOrUrl(value: string | undefined): string | undefined {
  const trimmed = trimEnv(value);
  if (!trimmed) return undefined;
  try {
    if (trimmed.includes("://")) return new URL(trimmed).origin;
    return new URL(`https://${trimmed}`).origin;
  } catch {
    return undefined;
  }
}

function vercelHostOrigins(env: AuthEnv): string[] {
  const origins: string[] = [];
  for (const key of [
    "VERCEL_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_BRANCH_URL",
  ] as const) {
    const origin = originFromHostOrUrl(env[key]);
    if (origin) origins.push(origin);
  }
  return origins;
}

/**
 * Origins Better Auth accepts on credentialed POSTs (email sign-in, etc.).
 * Always includes the public shop (www + apex), Vercel aliases, BETTER_AUTH_URL,
 * and local loopback — never only BETTER_AUTH_URL when that env is set.
 */
export function collectTrustedOrigins(
  env: AuthEnv,
  previewAllowedHosts: readonly string[],
): string[] {
  const origins = new Set<string>();

  for (const origin of PUBLIC_SHOP_ORIGINS) origins.add(origin);
  for (const origin of LOCAL_DEV_ORIGINS) origins.add(origin);
  origins.add(VERCEL_ALIAS_HOST_PATTERN);
  origins.add(`https://${VERCEL_ALIAS_HOST_PATTERN}`);

  const explicit = originFromHostOrUrl(env.BETTER_AUTH_URL);
  if (explicit) origins.add(explicit);
  for (const origin of vercelHostOrigins(env)) origins.add(origin);

  for (const host of previewAllowedHosts) {
    origins.add(host);
    if (host.includes("://")) continue;
    origins.add(`https://${host}`);
    origins.add(`http://${host}`);
  }

  return [...origins];
}

export function isProductionDeploy(env: AuthEnv): boolean {
  return trimEnv(env.VERCEL_ENV) === "production";
}

/**
 * Better Auth origin used for OAuth `redirect_uri` and absolute auth URLs.
 *
 * Production always prefers the public www shop, even when BETTER_AUTH_URL still
 * points at a Vercel alias or the apex. Preview keeps an explicit BETTER_AUTH_URL
 * so git-branch hosts keep working. Local / sandbox fall back to per-request
 * dynamic hosts (grok-sandbox + loopback).
 */
export function resolveAuthBaseURL(
  env: AuthEnv,
  previewAllowedHosts: readonly string[],
): AuthBaseURL {
  if (isProductionDeploy(env)) return PUBLIC_SHOP_ORIGIN;

  const explicit = trimEnv(env.BETTER_AUTH_URL);
  if (explicit) return explicit.replace(/\/+$/, "");

  return {
    allowedHosts: [
      ...previewAllowedHosts,
      "www.top-250.com",
      "top-250.com",
      VERCEL_ALIAS_HOST_PATTERN,
      "localhost",
      "127.0.0.1",
      "[::1]",
    ],
    protocol: "auto",
    fallback: "http://localhost:8080",
  };
}
