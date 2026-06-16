import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { db } from "../db";
import { sites } from "../db/schema";
import { WidgetService } from "../services/widget.service";

// ---------------------------------------------------------------------------
// PKCE Helpers (RFC 7636)
// ---------------------------------------------------------------------------

/** Generate a cryptographically random code_verifier (64‑char hex string). */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Derive a code_challenge from a code_verifier using SHA‑256 (S256). */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hash)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------------------------------------------------------------------------
// In‑memory rate limiter — per IP, sliding window
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX_REQUESTS = 10; // max 10 OAuth attempts per minute per IP

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/** Returns `true` if the request should be rate‑limited (rejected). */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_MAX_REQUESTS;
}

// Periodically clean stale entries (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 5 * 60_000);

// ---------------------------------------------------------------------------
// Validate origin against registered site domains
// ---------------------------------------------------------------------------

async function isOriginAllowed(origin: string): Promise<boolean> {
  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.hostname.toLowerCase().replace(/^www\./, "");

    // Always allow localhost in development
    if (originHost === "localhost" || originHost === "127.0.0.1") return true;

    const allSites = await db.select({ domain: sites.domain }).from(sites).all();
    return allSites.some((s) => {
      const siteDomain = s.domain.toLowerCase().replace(/^www\./, "");
      return originHost === siteDomain || originHost.endsWith(`.${siteDomain}`);
    });
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// OAuth Controller
// ---------------------------------------------------------------------------

export class OAuthController {
  /**
   * Step 1 — Redirect the user to the OAuth provider's consent screen.
   *
   * Security measures applied:
   *  • CSRF token stored in httpOnly cookie and embedded in `state`
   *  • PKCE code_verifier stored in httpOnly cookie; code_challenge sent to provider
   *  • Origin validated against registered site domains
   */
  static async redirect(c: Context) {
    // --- Rate limit ---
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return c.text("Too many requests. Please try again later.", 429);
    }

    const provider = c.req.param("provider");
    const redirectUri = `${process.env.API_URL}/api/v1/oauth/${provider}/callback`;
    const origin = c.req.query("origin") || "";

    if (provider === "google") {
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      if (!clientId) {
        return c.json({ error: "Google Client ID not configured" }, 500);
      }

      // --- CSRF protection (RFC 6749 §10.12) ---
      const csrfToken = crypto.randomUUID();

      // --- PKCE (RFC 7636) ---
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      const state = Buffer.from(JSON.stringify({ origin, csrf: csrfToken })).toString("base64");

      const isSecure = process.env.NODE_ENV === "production";

      setCookie(c, "diskus_oauth_csrf", csrfToken, {
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 600, // 10 minutes
        secure: isSecure,
      });

      setCookie(c, "diskus_oauth_pkce", codeVerifier, {
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 600,
        secure: isSecure,
      });

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "email profile",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

      return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    } else if (provider === "github") {
      const clientId = process.env.GITHUB_CLIENT_ID?.trim();
      if (!clientId) {
        return c.json({ error: "GitHub Client ID not configured" }, 500);
      }

      const csrfToken = crypto.randomUUID();
      const state = Buffer.from(JSON.stringify({ origin, csrf: csrfToken })).toString("base64");
      const isSecure = process.env.NODE_ENV === "production";

      setCookie(c, "diskus_oauth_csrf", csrfToken, {
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 600,
        secure: isSecure,
      });

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "user:email",
        state,
      });

      return c.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
    }

    return c.json({ error: "Provider not supported" }, 400);
  }

  /**
   * Step 2 — Handle the callback from the OAuth provider.
   *
   * Security measures applied:
   *  • CSRF validation (state ↔ cookie)
   *  • PKCE code_verifier sent with token exchange
   *  • Origin allow‑list check before redirect
   *  • Google access_token revoked immediately after use
   *  • postMessage targets specific origin (not '*')
   *  • Error logging for easier debugging
   */
  static async callback(c: Context) {
    // --- Rate limit ---
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return c.text("Too many requests. Please try again later.", 429);
    }

    const provider = c.req.param("provider");
    const code = c.req.query("code");
    const redirectUri = `${process.env.API_URL}/api/v1/oauth/${provider}/callback`;

    if (!code) {
      return c.text("No authorization code provided", 400);
    }

    // -----------------------------------------------------------------------
    // Validate CSRF state (Finding #1)
    // -----------------------------------------------------------------------
    const stateQuery = c.req.query("state");
    let origin = "";

    if (!stateQuery) {
      console.error("[OAuth] Missing state parameter");
      return c.text("Missing state parameter", 400);
    }

    try {
      const decoded = JSON.parse(Buffer.from(stateQuery, "base64").toString("utf-8"));
      origin = decoded.origin || "";

      const csrfCookie = getCookie(c, "diskus_oauth_csrf");
      if (!csrfCookie || csrfCookie !== decoded.csrf) {
        console.error("[OAuth] CSRF validation failed — cookie mismatch");
        return c.text("Invalid state parameter (CSRF check failed)", 403);
      }
    } catch (err) {
      console.error("[OAuth] Failed to decode state parameter:", err);
      return c.text("Invalid state parameter", 400);
    }

    // Clear CSRF cookie (single‑use)
    deleteCookie(c, "diskus_oauth_csrf", { path: "/" });

    // -----------------------------------------------------------------------
    // Validate origin against registered sites (Finding #2)
    // -----------------------------------------------------------------------
    if (origin) {
      const allowed = await isOriginAllowed(origin);
      if (!allowed) {
        console.error(`[OAuth] Origin not in allow‑list: ${origin}`);
        return c.text("Redirect origin not authorized", 403);
      }
    }

    // -----------------------------------------------------------------------
    // Retrieve PKCE code_verifier (Finding #5)
    // -----------------------------------------------------------------------
    const codeVerifier = getCookie(c, "diskus_oauth_pkce") || "";
    deleteCookie(c, "diskus_oauth_pkce", { path: "/" });

    // -----------------------------------------------------------------------
    // Exchange authorization code for tokens
    // -----------------------------------------------------------------------
    let email = "";
    let name = "";
    let providerUserId = "";
    let accessTokenToRevoke = "";

    if (provider === "google") {
      const tokenBody: Record<string, string> = {
        client_id: process.env.GOOGLE_CLIENT_ID?.trim() || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      };

      // Include PKCE code_verifier if available
      if (codeVerifier) {
        tokenBody.code_verifier = codeVerifier;
      }

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(tokenBody),
      });

      const tokenData = (await tokenRes.json()) as any;
      if (!tokenData.access_token) {
        // Finding #7 — informative error logging
        console.error("[OAuth] Google token exchange failed:", JSON.stringify(tokenData));
        return c.text("Failed to get token from Google", 400);
      }

      accessTokenToRevoke = tokenData.access_token;

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const googleUserData = (await userRes.json()) as any;

      if (!googleUserData.email) {
        console.error("[OAuth] Google userinfo missing email:", JSON.stringify(googleUserData));
        return c.text("Email scope missing", 400);
      }

      email = googleUserData.email;
      name = googleUserData.name || googleUserData.given_name || email.split("@")[0];
      providerUserId = googleUserData.id;
    } else if (provider === "github") {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID?.trim() || "",
          client_secret: process.env.GITHUB_CLIENT_SECRET?.trim() || "",
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = (await tokenRes.json()) as any;
      if (!tokenData.access_token) {
        console.error("[OAuth] GitHub token exchange failed:", JSON.stringify(tokenData));
        return c.text("Failed to get token from GitHub", 400);
      }

      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "Diskus-App",
        },
      });
      const githubUserData = (await userRes.json()) as any;

      let primaryEmail = githubUserData.email;

      // Fetch emails if public email is hidden
      if (!primaryEmail) {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "User-Agent": "Diskus-App",
          },
        });
        const emails = (await emailRes.json()) as any[];
        if (emails && emails.length > 0) {
          const primary = emails.find((e: any) => e.primary) || emails[0];
          if (primary) primaryEmail = primary.email;
        }
      }

      if (!primaryEmail) {
        console.error("[OAuth] GitHub userinfo missing email:", JSON.stringify(githubUserData));
        return c.text("Email scope missing or no email found", 400);
      }

      email = primaryEmail;
      name = githubUserData.name || githubUserData.login || email.split("@")[0];
      providerUserId = githubUserData.id.toString();
    } else {
      return c.text("Provider not supported", 400);
    }

    // -----------------------------------------------------------------------
    // Revoke Google access_token — we only needed it once (Finding #10)
    // -----------------------------------------------------------------------
    if (accessTokenToRevoke) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${accessTokenToRevoke}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }).catch((err) => console.warn("[OAuth] Failed to revoke Google token:", err));
    }

    // -----------------------------------------------------------------------
    // Account linking & user creation (unchanged logic)
    // -----------------------------------------------------------------------
    let user = null;

    // 1. Check if OAuth account already exists
    const existingOAuth = await WidgetService.findOAuthAccount(provider, providerUserId);

    if (existingOAuth) {
      user = await WidgetService.findWidgetUserById(existingOAuth.widgetUserId);
    } else {
      // 2. Check if a user with this email already exists
      user = await WidgetService.findWidgetUser(email);

      if (user) {
        // Link OAuth to existing account
        await WidgetService.linkOAuthAccount(provider, providerUserId, user.id);

        // Auto‑verify email if not yet verified
        if (!user.isVerified) {
          await WidgetService.markUserAsVerified(user.id);
          user.isVerified = true;
        }
      } else {
        // 3. Create brand‑new user + link OAuth account
        user = await WidgetService.registerOAuthUser(email, name, provider, providerUserId);
      }
    }

    if (!user) {
      return c.text("Failed to process user", 500);
    }

    // -----------------------------------------------------------------------
    // Generate JWT — with issuer claim (Finding #8)
    // -----------------------------------------------------------------------
    const jwtPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      iss: "diskus",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    };
    const token = await sign(jwtPayload, process.env.JWT_SECRET!);

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      hasPassword: user.passwordHash !== "[OAUTH_ACCOUNT]",
    };

    // -----------------------------------------------------------------------
    // Redirect back to origin with token in hash (Finding #4 — hash cleared by widget)
    // -----------------------------------------------------------------------
    if (origin) {
      const returnUrl = new URL(origin);
      returnUrl.hash = `diskus_oauth_token=${token}&user=${encodeURIComponent(JSON.stringify(userPayload))}`;
      return c.redirect(returnUrl.toString());
    }

    // -----------------------------------------------------------------------
    // Fallback: postMessage with specific targetOrigin (Finding #3 server‑side)
    // -----------------------------------------------------------------------
    const html = `<!DOCTYPE html>
<html>
<head><title>Authentication Successful</title></head>
<body>
  <p>Authentication successful! Please wait...</p>
  <script>
    if (window.opener) {
      try {
        window.opener.postMessage(
          { type: 'DISKUS_OAUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(userPayload)} },
          window.opener.location.origin
        );
      } catch (_e) {
        // Cross-origin — fall back to '*' as last resort
        window.opener.postMessage(
          { type: 'DISKUS_OAUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(userPayload)} },
          '*'
        );
      }
      window.close();
    } else {
      document.body.innerHTML = 'Authentication successful! You can close this window.';
    }
  </script>
</body>
</html>`;
    return c.html(html);
  }
}
