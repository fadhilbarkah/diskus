import { describe, expect, it } from "bun:test";
import { getParentOriginFromRequest, getParentHostnameFromRequest } from "../utils/request-origin";

describe("Request Origin Utils", () => {
  const mockContext = (headers: Record<string, string>) => {
    return {
      req: {
        header: (name: string) => headers[name.toLowerCase()],
      },
    } as any;
  };

  describe("getParentOriginFromRequest", () => {
    it("should return origin if present and not null", () => {
      const c = mockContext({ origin: "https://example.com" });
      expect(getParentOriginFromRequest(c)).toBe("https://example.com");
    });

    it("should ignore null origin and fallback to referer", () => {
      const c = mockContext({
        origin: "null",
        referer: "https://example.com/page",
      });
      expect(getParentOriginFromRequest(c)).toBe("https://example.com");
    });

    it("should ignore malformed referer", () => {
      const c = mockContext({
        referer: "not-a-valid-url",
        host: "localhost:3000",
      });
      expect(getParentOriginFromRequest(c)).toBe("https://localhost:3000");
    });

    it("should return undefined if sec-fetch-site is cross-site and no origin/referer", () => {
      const c = mockContext({
        "sec-fetch-site": "cross-site",
        host: "localhost:3000",
      });
      expect(getParentOriginFromRequest(c)).toBeUndefined();
    });

    it("should fallback to host and proto", () => {
      const c = mockContext({
        host: "my-site.com, something-else", // testing split
        "x-forwarded-proto": "http, https",
      });
      expect(getParentOriginFromRequest(c)).toBe("http://my-site.com");
    });

    it("should default proto to https if missing", () => {
      const c = mockContext({
        host: "my-site.com",
      });
      expect(getParentOriginFromRequest(c)).toBe("https://my-site.com");
    });

    it("should return undefined if no headers match", () => {
      const c = mockContext({});
      expect(getParentOriginFromRequest(c)).toBeUndefined();
    });
  });

  describe("getParentHostnameFromRequest", () => {
    it("should extract hostname from origin", () => {
      const c = mockContext({ origin: "https://sub.example.com" });
      expect(getParentHostnameFromRequest(c)).toBe("sub.example.com");
    });

    it("should return null if origin is not found", () => {
      const c = mockContext({ "sec-fetch-site": "cross-site" });
      expect(getParentHostnameFromRequest(c)).toBeNull();
    });

    it("should handle malformed domains safely via extractHostnameFromOrigin", () => {
      // getParentOriginFromRequest fallback to host: "invalid-url!"
      const c = mockContext({ host: "invalid-url!" });
      // extractHostnameFromOrigin will probably return null for invalid URLs
      // but let's see what it does. `new URL` throws.
      expect(getParentHostnameFromRequest(c)).toBe("invalid-url!");
    });
  });
});
