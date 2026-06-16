import type { Context } from "hono";
import { extractHostnameFromOrigin } from "./domain";

/**
 * Resolves the parent page origin for embed-token issuance.
 * Browsers omit `Origin` on same-origin GET requests, and strict Referrer-Policy
 * can strip Referer — so we fall back to Host + Sec-Fetch-Site when appropriate.
 */
export function getParentOriginFromRequest(c: Context): string | undefined {
  const origin = c.req.header("origin");
  if (origin && origin !== "null") return origin;

  const referer = c.req.header("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore malformed referer
    }
  }

  const secFetchSite = c.req.header("sec-fetch-site");
  if (secFetchSite === "cross-site") return undefined;

  const host = c.req.header("host")?.split(",")[0]?.trim();
  if (!host) return undefined;

  const proto = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return `${proto}://${host}`;
}

export function getParentHostnameFromRequest(c: Context): string | null {
  const origin = getParentOriginFromRequest(c);
  if (!origin) return null;
  return extractHostnameFromOrigin(origin);
}
