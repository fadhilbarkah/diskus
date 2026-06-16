/** Local/dev hostnames that skip domain whitelist checks */
const DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

export function isDevHostname(hostname: string): boolean {
  return DEV_HOSTNAMES.has(normalizeHostname(hostname));
}

/**
 * Returns true when `hostname` matches the registered site domain or is a subdomain of it.
 * Registered domains are stored without protocol or www prefix (see dashboard).
 */
function stripWww(hostname: string): string {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

export function isHostnameAllowed(hostname: string, allowedDomain: string): boolean {
  const host = stripWww(normalizeHostname(hostname));
  const domain = stripWww(normalizeHostname(allowedDomain));

  if (!host || !domain) return false;
  if (host === domain) return true;
  return host.endsWith(`.${domain}`);
}

export function extractHostnameFromOrigin(origin: string): string | null {
  try {
    return normalizeHostname(new URL(origin).hostname);
  } catch {
    return null;
  }
}

/**
 * Validates the browser-controlled Origin header against a site's registered domain.
 * Localhost is always allowed so developers can test against any registered domain.
 */
export function isOriginAllowedForSite(origin: string | undefined, siteDomain: string): boolean {
  if (!origin) return false;

  const hostname = extractHostnameFromOrigin(origin);
  if (!hostname) return false;
  if (isDevHostname(hostname)) return true;

  return isHostnameAllowed(hostname, siteDomain);
}
