import { beforeEach, describe, expect, it, vi } from "vitest";
import { authState, logout, setAuth, updateUser } from "../lib/auth";
import { selectedSiteId, theme, userSites } from "../lib/store";

describe("Dashboard Auth Lib", () => {
  beforeEach(() => {
    logout();
  });

  it("should have null token initially", () => {
    expect(authState.token.value).toBeNull();
    expect(authState.user.value).toBeNull();
    expect(authState.isLoggedIn.value).toBe(false);
  });

  it("should setAuth correctly", () => {
    setAuth("my-token", { id: "1", email: "test@test.com", role: "admin" });
    expect(authState.token.value).toBe("my-token");
    expect(authState.user.value?.email).toBe("test@test.com");
    expect(authState.isLoggedIn.value).toBe(true);
  });

  it("should update user correctly", () => {
    setAuth("my-token", { id: "1", email: "test@test.com", role: "admin" });
    updateUser({ name: "John" });
    expect(authState.user.value?.name).toBe("John");
  });

  it("should logout correctly", () => {
    setAuth("my-token", { id: "1", email: "test@test.com", role: "admin" });
    logout();
    expect(authState.token.value).toBeNull();
  });

  describe("isTokenValidLocally", () => {
    const createToken = (exp?: number) => {
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = exp ? btoa(JSON.stringify({ exp })) : btoa(JSON.stringify({}));
      const signature = btoa("signature");
      return `${header}.${payload}.${signature}`;
    };

    beforeEach(() => {
      vi.resetModules();
      localStorage.removeItem("diskus_token");
      localStorage.removeItem("diskus_user");
    });

    it("should accept valid token on boot", async () => {
      const validToken = createToken(Math.floor(Date.now() / 1000) + 3600); // 1 hour valid
      localStorage.setItem("diskus_token", validToken);
      localStorage.setItem("diskus_user", JSON.stringify({ email: "test@test.com" }));

      const mod = await import("../lib/auth");
      expect(mod.authState.token.value).toBe(validToken);
    });

    it("should clear expired token on boot", async () => {
      const expiredToken = createToken(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago
      localStorage.setItem("diskus_token", expiredToken);
      localStorage.setItem("diskus_user", JSON.stringify({ email: "test@test.com" }));

      const mod = await import("../lib/auth");
      expect(mod.authState.token.value).toBeNull();
      expect(localStorage.getItem("diskus_token")).toBeNull();
    });

    it("should clear malformed token on boot", async () => {
      localStorage.setItem("diskus_token", "not.a.jwt");
      localStorage.setItem("diskus_user", JSON.stringify({ email: "test@test.com" }));

      const mod = await import("../lib/auth");
      expect(mod.authState.token.value).toBeNull();
    });
  });
});

describe("Dashboard Store Lib", () => {
  it("should manage userSites and selectedSiteId", () => {
    userSites.value = [{ id: "site-1" }];
    selectedSiteId.value = "site-1";
    expect(userSites.value.length).toBe(1);
    expect(localStorage.getItem("diskus_selected_site_id")).toBe("site-1");
  });

  it("should manage theme", () => {
    theme.value = "dark";
    expect(theme.value).toBe("dark");
    expect(localStorage.getItem("diskus_theme")).toBe("dark");
  });
});
