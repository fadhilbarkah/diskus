import { afterEach, beforeAll, describe, expect, it, mock, spyOn } from "bun:test";
import { Hono } from "hono";
import adminRoutes from "../routes/admin";
import { AdminService } from "../services/admin.service";
import { AuthService } from "../services/auth.service";
import { signToken } from "../utils/jwt";

const app = new Hono();
app.route("/admin", adminRoutes);

describe("AdminController", () => {
  let token: string;
  let adminToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = "supersecret";
    token = await signToken({ userId: "u1", email: "test@test.com", role: "user", name: "User" });
    adminToken = await signToken({
      userId: "a1",
      email: "admin@test.com",
      role: "admin",
      name: "Admin",
    });

    // Mock Bun.password
    (Bun as any).password = {
      hash: mock().mockResolvedValue("hashed"),
      verify: mock().mockResolvedValue(true),
    } as any;
  });

  afterEach(() => {
    mock.restore();
  });

  const req = (path: string, method = "GET", body?: any, useAdmin = false) => {
    return new Request(`http://localhost${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${useAdmin ? adminToken : token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  it("should get sites", async () => {
    spyOn(AdminService, "getUserSites").mockResolvedValue([
      { id: "s1", domain: "test.com" },
    ] as any);
    const res = await app.fetch(req("/admin/sites"));
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).sites.length).toBe(1);
  });

  it("should create site", async () => {
    spyOn(AdminService, "createSite").mockResolvedValue({ id: "s1", domain: "test.com" } as any);
    const res = await app.fetch(req("/admin/sites", "POST", { domain: "test.com" }));
    expect(res.status).toBe(200);
  });

  it("should update site", async () => {
    spyOn(AdminService, "updateSite").mockResolvedValue(undefined);
    const res = await app.fetch(req("/admin/sites/s1", "PATCH", { requireLogin: true }));
    expect(res.status).toBe(200);
  });

  it("should delete site", async () => {
    spyOn(AdminService, "deleteSite").mockResolvedValue(undefined);
    const res = await app.fetch(req("/admin/sites/s1", "DELETE"));
    expect(res.status).toBe(200);
  });

  it("should get analytics", async () => {
    spyOn(AdminService, "getAnalyticsSummary").mockResolvedValue({ views: 10 } as any);
    const res = await app.fetch(req("/admin/analytics/summary"));
    expect(res.status).toBe(200);
  });

  it("should get comments", async () => {
    spyOn(AdminService, "getUserAccount").mockResolvedValue({ email: "test@test.com" } as any);
    spyOn(AdminService, "getComments").mockResolvedValue([
      { id: "c1", authorEmail: "test@test.com" },
    ] as any);
    const res = await app.fetch(req("/admin/comments"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect((json as any).comments[0].isAuthor).toBe(true);
  });

  it("should update comments bulk", async () => {
    spyOn(AdminService, "updateCommentsStatus").mockResolvedValue(undefined);
    const res = await app.fetch(
      req("/admin/comments/bulk", "PATCH", { ids: ["c1"], status: "approved" }),
    );
    expect(res.status).toBe(200);
  });

  it("should delete comments bulk", async () => {
    spyOn(AdminService, "deleteCommentsBulk").mockResolvedValue(undefined);
    const res = await app.fetch(req("/admin/comments/bulk", "DELETE", { ids: ["c1"] }));
    expect(res.status).toBe(200);
  });

  it("should toggle pin comment (admin)", async () => {
    spyOn(AdminService, "togglePinComment").mockResolvedValue(undefined);
    const res = await app.fetch(req("/admin/comments/c1/pin", "PATCH", { isPinned: true }, true));
    expect(res.status).toBe(200);
  });

  it("should toggle pin comment (user, owner)", async () => {
    spyOn(AdminService, "verifyCommentOwnershipByUser").mockResolvedValue(true);
    spyOn(AdminService, "togglePinComment").mockResolvedValue(undefined);
    const res = await app.fetch(req("/admin/comments/c1/pin", "PATCH", { isPinned: true }));
    expect(res.status).toBe(200);
  });

  it("should fail pin comment (user, not owner)", async () => {
    spyOn(AdminService, "verifyCommentOwnershipByUser").mockResolvedValue(false);
    const res = await app.fetch(req("/admin/comments/c1/pin", "PATCH", { isPinned: true }));
    expect(res.status).toBe(403);
  });

  it("should get account", async () => {
    spyOn(AdminService, "getUserAccount").mockResolvedValue({
      id: "u1",
      name: "User",
      email: "test@test.com",
    } as any);
    const res = await app.fetch(req("/admin/account"));
    expect(res.status).toBe(200);
  });

  it("should update account", async () => {
    spyOn(AdminService, "getUserAccount").mockResolvedValue({
      id: "u1",
      name: "User",
      email: "test@test.com",
      passwordHash: "hashed",
    } as any);
    spyOn(AdminService, "updateUserAccount").mockResolvedValue(undefined);
    spyOn(AuthService, "incrementTokenVersion").mockResolvedValue(2);

    const res = await app.fetch(
      req("/admin/account", "PUT", {
        name: "User2",
        currentPassword: "pwd",
        newPassword: "newpwd",
      }),
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).token).toBeDefined();
  });

  it("should export data", async () => {
    spyOn(AdminService, "exportData").mockResolvedValue({ exported: true } as any);
    const res = await app.fetch(req("/admin/export/s1"));
    expect(res.status).toBe(200);
  });

  it("should import data", async () => {
    spyOn(AdminService, "importData").mockResolvedValue(true);
    const res = await app.fetch(req("/admin/import/s1", "POST", { comments: [] }));
    expect(res.status).toBe(200);
  });

  it("should get widget users (admin)", async () => {
    spyOn(AdminService, "getWidgetUsers").mockResolvedValue([]);
    const res = await app.fetch(req("/admin/users", "GET", undefined, true));
    expect(res.status).toBe(200);
  });

  it("should fail widget users (not admin)", async () => {
    const res = await app.fetch(req("/admin/users"));
    expect(res.status).toBe(403);
  });

  it("should delete widget user (admin)", async () => {
    spyOn(AdminService, "deleteWidgetUser").mockResolvedValue(undefined);
    const res = await app.fetch(req("/admin/users/u1", "DELETE", undefined, true));
    expect(res.status).toBe(200);
  });
});
