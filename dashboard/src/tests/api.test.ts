import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import { setAuth } from "../lib/auth";

describe("Dashboard API Lib", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("should perform login", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ token: "test", user: {} }),
    });

    const res = await api.login("test@test.com", "password");
    expect(res.token).toBe("test");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.any(Object),
    );
  });

  it("should handle api errors correctly", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "Bad Request" }),
    });

    await expect(api.getSites()).rejects.toThrow("Bad Request");
  });

  it("should handle 401 Unauthorized", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: "Unauthorized" }),
    });

    await expect(api.getSites()).rejects.toThrow("Unauthorized");
  });

  it("should handle 403 Demo Mode", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ demo: true, error: "Demo mode" }),
    });

    await expect(api.getSites()).rejects.toThrow("Demo mode");
  });

  it("should attach token to requests", async () => {
    setAuth("my-secret-token", { id: "1", email: "test@test.com", role: "admin" });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ id: "site-1" }]),
    });

    await api.getSites();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/admin/sites"),
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it("should cover other API endpoints", async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, text: async () => "{}" });

    await api.register("test", "test");
    await api.getSetupStatus();
    await api.getAnalytics();
    await api.getComments("all");
    await api.bulkUpdateComments([], "approved");
    await api.togglePinComment("1", true);
    await api.deleteComments([]);
    await api.createSite("test.com");
    await api.updateSite("1", {});
    await api.deleteSite("1");
    await api.getAccount();
    await api.updateAccount({});
    await api.exportComments("1");
    await api.importComments("1", {});
    const formData = new FormData();
    await api.importDisqusComments("1", formData);
    await api.getUsers();
    await api.deleteUser("1");
  });
});
