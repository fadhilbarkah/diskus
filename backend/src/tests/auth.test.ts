import { beforeAll, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import oauthRoutes from "../routes/oauth";

// Setup mock app for testing
const setupApp = () => {
  const app = new Hono();
  app.route("/oauth", oauthRoutes);
  return app;
};

describe("OAuthController (In-Memory DB Test)", () => {
  let app: Hono;

  beforeAll(() => {
    app = setupApp();

    // Set dummy environment variables to bypass checks temporarily or trigger specific branches
    process.env.DISCUSS_APP_URL = "http://localhost:3000";
    process.env.JWT_SECRET = "supersecret";
  });

  it("Should reject Google OAuth if Google Client ID is not configured", async () => {
    // Ensure it's not set
    delete process.env.GOOGLE_CLIENT_ID;

    const req = new Request("http://localhost/oauth/google");
    const res = await app.fetch(req);
    expect(res.status).toBe(500);

    const body = (await res.json()) as any;
    expect(body.error).toBe("Google Client ID not configured");
  });

  it("Should reject GitHub OAuth if GitHub Client ID is not configured", async () => {
    delete process.env.GITHUB_CLIENT_ID;

    const req = new Request("http://localhost/oauth/github");
    const res = await app.fetch(req);
    expect(res.status).toBe(500);

    const body = (await res.json()) as any;
    expect(body.error).toBe("GitHub Client ID not configured");
  });

  it("Should block OAuth callback if CSRF state parameter is missing", async () => {
    // Mock Google Client ID to pass the initial config check
    process.env.GOOGLE_CLIENT_ID = "mock-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "mock-secret";

    const req = new Request("http://localhost/oauth/google/callback");
    const res = await app.fetch(req);
    expect(res.status).toBe(400);

    const text = await res.text();
    expect(text).toContain("authorization code");
  });

  it("Should rate limit IPs trying to hit OAuth endpoint repeatedly", async () => {
    process.env.GITHUB_CLIENT_ID = "mock";
    process.env.GITHUB_CLIENT_SECRET = "mock";

    let status429Hit = false;
    for (let i = 0; i < 20; i++) {
      const req = new Request("http://localhost/oauth/github", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      const res = await app.fetch(req);
      if (res.status === 429) {
        status429Hit = true;
        break;
      }
    }

    expect(status429Hit).toBe(true);
  });

  it("Should redirect to Google OAuth login", async () => {
    process.env.GOOGLE_CLIENT_ID = "mock-id";
    const req = new Request("http://localhost/oauth/google?origin_url=http://test.com", {
      method: "GET",
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("accounts.google.com");
  });

  it("Should redirect to GitHub OAuth login", async () => {
    process.env.GITHUB_CLIENT_ID = "mock-id";
    const req = new Request("http://localhost/oauth/github?origin_url=http://test.com", {
      method: "GET",
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("github.com/login/oauth/authorize");
  });
  it("Should return 400 if state parameter is missing", async () => {
    const req = new Request("http://localhost/oauth/google/callback?code=abc", {
      headers: { "x-forwarded-for": "ip1" }
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing state parameter");
  });

  it("Should return 400 if state parameter is invalid JSON", async () => {
    const state = Buffer.from("not-json").toString("base64");
    const req = new Request(`http://localhost/oauth/google/callback?code=abc&state=${state}`, {
      headers: { "x-forwarded-for": "ip2" }
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid state parameter");
  });

  it("Should return 403 if CSRF validation fails (cookie mismatch)", async () => {
    const state = Buffer.from(JSON.stringify({ csrf: "expected-csrf" })).toString("base64");
    const req = new Request(`http://localhost/oauth/google/callback?code=abc&state=${state}`, {
      headers: { "x-forwarded-for": "ip3" }
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("Invalid state parameter (CSRF check failed)");
  });

  it("Should return 403 if origin is not allowed", async () => {
    const state = Buffer.from(
      JSON.stringify({ csrf: "csrf-token", origin: "http://malicious.com" })
    ).toString("base64");
    const req = new Request(`http://localhost/oauth/google/callback?code=abc&state=${state}`, {
      headers: { "x-forwarded-for": "ip4" }
    });
    req.headers.set("Cookie", "diskus_oauth_csrf=csrf-token");
    const res = await app.fetch(req);
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("Redirect origin not authorized");
  });

  it("Should return 400 if provider is unsupported", async () => {
    const state = Buffer.from(JSON.stringify({ csrf: "csrf-token" })).toString("base64");
    const req = new Request(`http://localhost/oauth/unknown/callback?code=abc&state=${state}`, {
      headers: { "x-forwarded-for": "ip5" }
    });
    req.headers.set("Cookie", "diskus_oauth_csrf=csrf-token");
    const res = await app.fetch(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Provider not supported");
  });

  it("Should handle Google OAuth failure (token exchange failed)", async () => {
    const state = Buffer.from(JSON.stringify({ csrf: "csrf-token" })).toString("base64");
    const req = new Request(`http://localhost/oauth/google/callback?code=abc&state=${state}`, {
      headers: { "x-forwarded-for": "ip6" }
    });
    req.headers.set("Cookie", "diskus_oauth_csrf=csrf-token");

    const originalFetch = global.fetch;
    global.fetch = (async () => new Response(JSON.stringify({}), { status: 400 })) as any;

    const res = await app.fetch(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Failed to get token from Google");

    global.fetch = originalFetch;
  });

  it("Should handle GitHub OAuth failure (token exchange failed)", async () => {
    const state = Buffer.from(JSON.stringify({ csrf: "csrf-token" })).toString("base64");
    const req = new Request(`http://localhost/oauth/github/callback?code=abc&state=${state}`, {
      headers: { "x-forwarded-for": "ip7" }
    });
    req.headers.set("Cookie", "diskus_oauth_csrf=csrf-token");

    const originalFetch = global.fetch;
    global.fetch = (async () => new Response(JSON.stringify({}), { status: 400 })) as any;

    const res = await app.fetch(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Failed to get token from GitHub");

    global.fetch = originalFetch;
  });

  it("Should handle Google OAuth success and return postMessage HTML", async () => {
    const state = Buffer.from(JSON.stringify({ csrf: "csrf-token" })).toString("base64");
    const req = new Request(`http://localhost/oauth/google/callback?code=abc&state=${state}`, {
      headers: { "x-forwarded-for": "ip8" }
    });
    req.headers.set("Cookie", "diskus_oauth_csrf=csrf-token; diskus_oauth_pkce=verifier");

    const originalFetch = global.fetch;
    global.fetch = (async (url: any) => {
      if (url.toString().includes("token"))
        return new Response(JSON.stringify({ access_token: "mock-token" }));
      if (url.toString().includes("revoke")) return new Response("");
      if (url.toString().includes("userinfo"))
        return new Response(
          JSON.stringify({ email: "test@google.com", name: "Test Google", id: "g1" })
        );
      return new Response("");
    }) as any;

    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("postMessage");

    global.fetch = originalFetch;
  });

  it("Should handle GitHub OAuth success and redirect with token", async () => {
    const state = Buffer.from(
      JSON.stringify({ csrf: "csrf-token", origin: "http://localhost:3000" })
    ).toString("base64");
    const req = new Request(`http://localhost/oauth/github/callback?code=abc&state=${state}`, {
      headers: { "x-forwarded-for": "ip9" }
    });
    req.headers.set("Cookie", "diskus_oauth_csrf=csrf-token");

    const originalFetch = global.fetch;
    global.fetch = (async (url: any) => {
      if (url.toString().includes("access_token"))
        return new Response(JSON.stringify({ access_token: "mock-token" }));
      if (url.toString().includes("user/emails"))
        return new Response(JSON.stringify([{ email: "test@github.com", primary: true }]));
      if (url.toString().includes("user"))
        return new Response(JSON.stringify({ login: "githubuser", id: "gh1" }));
      return new Response("");
    }) as any;

    const res = await app.fetch(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("diskus_oauth_token");

    global.fetch = originalFetch;
  });
});
