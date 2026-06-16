import { describe, expect, it, mock, spyOn } from "bun:test";
import { Hono } from "hono";
import { db } from "../db";
import { authMiddleware, optionalAuthMiddleware } from "../middlewares/auth";
import * as jwt from "../utils/jwt";

describe("Auth Middleware", () => {
  const setupApp = () => {
    const app = new Hono();
    app.get("/protected", authMiddleware, (c) => c.json({ ok: true, user: c.get("user") }));
    app.get("/optional", optionalAuthMiddleware, (c) => c.json({ ok: true, user: c.get("user") }));
    return app;
  };

  it("Should reject if no auth header", async () => {
    const app = setupApp();
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("Should reject if invalid token format", async () => {
    const app = setupApp();
    const res = await app.request("/protected", { headers: { Authorization: "InvalidToken" } });
    expect(res.status).toBe(401);
  });

  it("Should reject if token verification fails", async () => {
    spyOn(jwt, "verifyToken").mockResolvedValueOnce(null);
    const app = setupApp();
    const res = await app.request("/protected", { headers: { Authorization: "Bearer bad-token" } });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid token" });
  });

  it("Should reject if tokenVersion is revoked", async () => {
    spyOn(jwt, "verifyToken").mockResolvedValueOnce({ userId: "u1", tokenVersion: 1 });
    // Mock DB response
    const mockGet = mock().mockReturnValueOnce({ tokenVersion: 2 });
    const mockWhere = mock().mockReturnValueOnce({ get: mockGet });
    const mockFrom = mock().mockReturnValueOnce({ where: mockWhere });
    spyOn(db, "select").mockReturnValueOnce({ from: mockFrom } as any);

    const app = setupApp();
    const res = await app.request("/protected", { headers: { Authorization: "Bearer tok" } });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Token has been revoked. Please login again." });
  });

  it("Should allow if tokenVersion matches", async () => {
    spyOn(jwt, "verifyToken").mockResolvedValueOnce({ userId: "u1", tokenVersion: 1 });
    const mockGet = mock().mockReturnValueOnce({ tokenVersion: 1 });
    const mockWhere = mock().mockReturnValueOnce({ get: mockGet });
    const mockFrom = mock().mockReturnValueOnce({ where: mockWhere });
    spyOn(db, "select").mockReturnValueOnce({ from: mockFrom } as any);

    const app = setupApp();
    const res = await app.request("/protected", { headers: { Authorization: "Bearer tok" } });
    expect(res.status).toBe(200);
  });

  // --- Optional Middleware ---
  it("Optional: Should allow if no token provided", async () => {
    const app = setupApp();
    const res = await app.request("/optional");
    expect(res.status).toBe(200);
    expect((await res.json() as any).user).toBeUndefined();
  });

  it("Optional: Should allow and not set user if token is invalid", async () => {
    spyOn(jwt, "verifyToken").mockResolvedValueOnce(null);
    const app = setupApp();
    const res = await app.request("/optional", { headers: { Authorization: "Bearer tok" } });
    expect(res.status).toBe(200);
    expect((await res.json() as any).user).toBeUndefined();
  });

  it("Optional: Should clear user if tokenVersion is revoked", async () => {
    spyOn(jwt, "verifyToken").mockResolvedValueOnce({ userId: "u1", tokenVersion: 1 });
    const mockGet = mock().mockReturnValueOnce({ tokenVersion: 2 });
    const mockWhere = mock().mockReturnValueOnce({ get: mockGet });
    const mockFrom = mock().mockReturnValueOnce({ where: mockWhere });
    spyOn(db, "select").mockReturnValueOnce({ from: mockFrom } as any);

    const app = setupApp();
    const res = await app.request("/optional", { headers: { Authorization: "Bearer tok" } });
    expect(res.status).toBe(200);
    expect((await res.json() as any).user).toBeUndefined();
  });

  it("Optional: Should set user if tokenVersion matches", async () => {
    spyOn(jwt, "verifyToken").mockResolvedValueOnce({ userId: "u1", tokenVersion: 1 });
    const mockGet = mock().mockReturnValueOnce({ tokenVersion: 1 });
    const mockWhere = mock().mockReturnValueOnce({ get: mockGet });
    const mockFrom = mock().mockReturnValueOnce({ where: mockWhere });
    spyOn(db, "select").mockReturnValueOnce({ from: mockFrom } as any);

    const app = setupApp();
    const res = await app.request("/optional", { headers: { Authorization: "Bearer tok" } });
    expect(res.status).toBe(200);
    expect((await res.json() as any).user).toBeDefined();
  });
});
