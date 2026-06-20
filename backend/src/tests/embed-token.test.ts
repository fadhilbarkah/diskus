import { describe, expect, it } from "bun:test";
import { signEmbedToken, verifyEmbedToken } from "../utils/embed-token";

describe("Embed Token Utils", () => {
  const mockPayload = {
    siteId: "test-site-123",
    apiKey: "test-api-key",
    parentHost: "example.com",
  };

  it("should successfully sign and verify a token", async () => {
    const token = await signEmbedToken(mockPayload);
    expect(typeof token).toBe("string");

    const decoded = await verifyEmbedToken(token);
    expect(decoded).toBeDefined();
    expect(decoded?.siteId).toBe(mockPayload.siteId);
    expect(decoded?.apiKey).toBe(mockPayload.apiKey);
    expect(decoded?.parentHost).toBe(mockPayload.parentHost);
    expect(decoded?.type).toBe("embed");
  });

  it("should return null for corrupted token", async () => {
    const token = await signEmbedToken(mockPayload);
    const corruptedToken = token.slice(0, -5) + "abcde";
    
    const decoded = await verifyEmbedToken(corruptedToken);
    expect(decoded).toBeNull();
  });

  it("should return null for completely invalid token", async () => {
    const decoded = await verifyEmbedToken("not.a.real.jwt");
    expect(decoded).toBeNull();
  });

  // Note: testing expiration is difficult without mocking timers in Jose,
  // but standard jwtVerify behavior is already battle-tested.
  // We verified our specific requirements (types and fields).
});
