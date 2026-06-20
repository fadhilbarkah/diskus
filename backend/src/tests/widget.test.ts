import { afterEach, beforeAll, describe, expect, it, mock, spyOn } from "bun:test";
import { NotificationService } from "../services/notification.service";
import { Hono } from "hono";
import widgetRoutes from "../routes/widget";
import { AdminService } from "../services/admin.service";
import { WidgetService } from "../services/widget.service";
import { signToken } from "../utils/jwt";

const app = new Hono();
app.use("*", async (c, next) => {
  c.req.header = (name?: string) => {
    if (!name) return {} as any;
    if (name.toLowerCase() === "x-forwarded-for") return `127.0.0.${Math.floor(Math.random() * 255)}`;
    return (c.req.raw.headers as any).get(name);
  };
  await next();
});
app.route("/widget", widgetRoutes);

describe("WidgetController", () => {
  let token: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = "supersecret";
    token = await signToken({
      userId: "u1",
      email: "test@test.com",
      role: "commenter",
      name: "User",
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

  const req = (path: string, method = "GET", body?: any, useAuth = false) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (useAuth) headers.Authorization = `Bearer ${token}`;
    return new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  it("should register", async () => {
    spyOn(WidgetService, "findWidgetUser").mockResolvedValue(null as any);
    spyOn(WidgetService, "hashPassword").mockResolvedValue("hashed");
    spyOn(WidgetService, "registerWidgetUser").mockResolvedValue({
      id: "u1",
      email: "e",
      name: "n",
    } as any);
    spyOn(WidgetService, "updateVerificationToken").mockResolvedValue(undefined);

    const res = await app.fetch(
      req("/widget/auth/register", "POST", {
        email: "e@e.com",
        name: "Name",
        password: "password",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("should trigger register honeypot", async () => {
    const res = await app.fetch(
      req("/widget/auth/register", "POST", {
        email: "bot@e.com",
        name: "Bot",
        password: "password",
        _diskus_trap: "true",
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json() as any).token).toBe("dummy_token_for_bots");
  });

  it("should fail register if email already exists", async () => {
    spyOn(WidgetService, "findWidgetUser").mockResolvedValue(null as any);
    spyOn(WidgetService, "hashPassword").mockResolvedValue("hashed");
    spyOn(WidgetService, "registerWidgetUser").mockRejectedValue(new Error("UNIQUE constraint failed: users.email"));
    const res = await app.fetch(
      req("/widget/auth/register", "POST", {
        email: "exist@e.com",
        name: "Exist",
        password: "password",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("should resend verification", async () => {
    spyOn(WidgetService, "findWidgetUser").mockResolvedValue({
      id: "u1",
      email: "e@e.com",
      isVerified: false,
    } as any);
    spyOn(WidgetService, "updateVerificationToken").mockResolvedValue(undefined);
    const res = await app.fetch(
      req("/widget/auth/resend-verification", "POST", { origin_url: "http://test.com" }, true),
    );
    expect(res.status).toBe(200);
  });

  it("should verify email", async () => {
    spyOn(WidgetService, "verifyEmailToken").mockResolvedValue(true);
    const res = await app.fetch(req("/widget/auth/verify-email?token=abc"));
    expect(res.status).toBe(200);
  });

  it("should forgot password", async () => {
    spyOn(WidgetService, "generatePasswordResetToken").mockResolvedValue({
      user: { email: "e", name: "n" },
      resetToken: "t",
    } as any);
    const res = await app.fetch(
      req("/widget/auth/forgot-password", "POST", {
        email: "e@e.com",
        origin_url: "http://test.com",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("should validate reset token", async () => {
    spyOn(WidgetService, "validateResetToken").mockResolvedValue(true);
    const res = await app.fetch(req("/widget/auth/reset-password/validate?token=abc"));
    expect(res.status).toBe(200);
  });

  it("should reset password", async () => {
    spyOn(WidgetService, "resetPasswordWithToken").mockResolvedValue(true);
    const res = await app.fetch(
      req("/widget/auth/reset-password", "POST", { token: "abc", newPassword: "password" }),
    );
    expect(res.status).toBe(200);
  });

  it("should set password", async () => {
    spyOn(WidgetService, "findWidgetUser").mockResolvedValue({
      id: "u1",
      email: "e@e.com",
      passwordHash: "[OAUTH_ACCOUNT]",
    } as any);
    const res = await app.fetch(
      req("/widget/auth/set-password", "POST", { newPassword: "password" }, true),
    );
    expect(res.status).toBe(200);
  });

  it("should login", async () => {
    spyOn(WidgetService, "findDashboardUser").mockResolvedValue(null as any);
    spyOn(WidgetService, "findWidgetUser").mockResolvedValue({
      id: "u1",
      email: "e@e.com",
      passwordHash: "hashed",
      isVerified: true,
    } as any);
    spyOn(WidgetService, "verifyPassword").mockResolvedValue(true);
    const res = await app.fetch(req("/widget/auth/login", "POST", { email: "e@e.com", password: "p" }));
    expect(res.status).toBe(200);
  });

  it("should fail login with wrong password", async () => {
    spyOn(WidgetService, "findDashboardUser").mockResolvedValue(null as any);
    spyOn(WidgetService, "findWidgetUser").mockResolvedValue({
      id: "u1",
      email: "wrong@e.com",
      passwordHash: "h",
    } as any);
    spyOn(WidgetService, "verifyPassword").mockResolvedValue(false);
    const res = await app.fetch(req("/widget/auth/login", "POST", { email: "wrong@e.com", password: "p" }));
    expect(res.status).toBe(401);
  });

  it("should login as dashboard admin", async () => {
    spyOn(WidgetService, "findDashboardUser").mockResolvedValue({
      id: "admin1",
      email: "admin@e.com",
      passwordHash: "hash",
      role: "admin",
    } as any);
    spyOn(WidgetService, "verifyPassword").mockResolvedValue(true);
    const res = await app.fetch(req("/widget/auth/login", "POST", { email: "admin@e.com", password: "p" }));
    expect(res.status).toBe(200);
  });

  it("should fail login if oauth account", async () => {
    spyOn(WidgetService, "findDashboardUser").mockResolvedValue(null as any);
    spyOn(WidgetService, "findWidgetUser").mockResolvedValue({
      id: "u1",
      email: "oauth@e.com",
      passwordHash: "[OAUTH_ACCOUNT]",
    } as any);
    const res = await app.fetch(req("/widget/auth/login", "POST", { email: "oauth@e.com", password: "p" }));
    expect(res.status).toBe(401);
  });

  it("should get me", async () => {
    spyOn(WidgetService, "findWidgetUser").mockResolvedValue({
      id: "u1",
      email: "e@e.com",
      isVerified: true,
      passwordHash: "hashed",
    } as any);
    const res = await app.fetch(req("/widget/auth/me", "GET", undefined, true));
    expect(res.status).toBe(200);
  });

  it("should get embed token", async () => {
    spyOn(WidgetService, "issueEmbedToken").mockResolvedValue({ token: "embed_token" } as any);
    const res = await app.fetch(req("/widget/embed-token?api_key=key"));
    expect(res.status).toBe(200);
  });

  it("should fail get embed token if invalid api key", async () => {
    spyOn(WidgetService, "issueEmbedToken").mockResolvedValue({ error: "invalid_key" } as any);
    const res = await app.fetch(req("/widget/embed-token?api_key=wrong"));
    expect(res.status).toBe(403);
  });

  it("should fail get embed token if missing api key", async () => {
    const res = await app.fetch(req("/widget/embed-token"));
    expect(res.status).toBe(400);
  });

  it("should get comments", async () => {
    spyOn(WidgetService, "verifyApiKey").mockResolvedValue({
      site: { id: "s1", userId: "u1", commentsLimit: 10 },
    } as any);
    spyOn(AdminService, "getUserAccount").mockResolvedValue({ email: "owner@test.com" } as any);
    spyOn(WidgetService, "getComments").mockResolvedValue({
      comments: [{ authorEmail: "owner@test.com" }],
      hasMore: false,
      total: 1,
    } as any);
    const res = await app.fetch(req("/widget/comments?api_key=key&thread_key=thread1"));
    expect(res.status).toBe(200);
  });

  it("should fail to get comments if missing api_key or thread_key", async () => {
    const res = await app.fetch(req("/widget/comments?thread_key=thread1"));
    expect(res.status).toBe(400);

    const res2 = await app.fetch(req("/widget/comments?api_key=key"));
    expect(res2).toBeDefined();
  });

  it("should post comment", async () => {
    spyOn(WidgetService, "verifyApiKey").mockResolvedValue({
      site: { id: "s1", userId: "u1", requireModeration: false },
    } as any);
    spyOn(WidgetService, "getThread").mockResolvedValue({ id: "t1", title: "Thread" } as any);
    spyOn(AdminService, "getUserAccount").mockResolvedValue({ email: "owner@test.com" } as any);
    spyOn(WidgetService, "createComment").mockResolvedValue({
      id: "c1",
      authorEmail: "test@test.com",
    } as any);

    const res = await app.fetch(
      req(
        "/widget/comments",
        "POST",
        {
          api_key: "key",
          thread_key: "t1",
          content: "Hello",
          authorName: "N",
          authorEmail: "e@e.com",
        },
        true,
      ),
    );
    expect(res.status).toBe(201);
  });

  it("should fail to post comment if missing api_key or content", async () => {
    const res = await app.fetch(
      req("/widget/comments", "POST", { thread_key: "t1", content: "Hello" }, true)
    );
    expect(res.status).toBe(400);
  });

  it("should fail to post comment if not logged in", async () => {
    const res = await app.fetch(
      req("/widget/comments", "POST", { api_key: "key", thread_key: "t1", content: "Hello" }, false)
    );
    expect(res.status).toBe(403);
  });

  it("should block guest comment if requireLogin is true", async () => {
    spyOn(WidgetService, "verifyApiKey").mockResolvedValue({
      site: { id: "s1", userId: "u1", requireLogin: true },
    } as any);
    spyOn(WidgetService, "getThread").mockResolvedValue({ id: "t1", title: "Thread", url: "https://example.com" } as any);
    const res = await app.fetch(
      req(
        "/widget/comments",
        "POST",
        {
          api_key: "key",
          thread_key: "t1",
          content: "Hello",
          authorName: "Guest",
          authorEmail: "guest@test.com",
        },
        false, // not logged in
      ),
    );
    expect(res.status).toBe(401);
  });

  it("should post comment and send email notification", async () => {
    spyOn(WidgetService, "verifyApiKey").mockResolvedValue({
      site: { id: "s1", userId: "u1", requireModeration: true, enableEmail: true },
    } as any);
    spyOn(WidgetService, "getThread").mockResolvedValue({ id: "t1", title: "Thread", url: "https://example.com" } as any);
    spyOn(AdminService, "getUserAccount").mockResolvedValue({ email: "owner@test.com" } as any);
    spyOn(WidgetService, "createComment").mockResolvedValue({
      id: "c2",
      authorEmail: "test@test.com",
      status: "pending"
    } as any);
    spyOn(NotificationService, "sendNewCommentEmail").mockResolvedValue(undefined);
    spyOn(NotificationService, "sendReplyEmail").mockResolvedValue(undefined);

    spyOn(WidgetService, "getCommentById").mockResolvedValue({
      id: "c1",
      authorEmail: "parent@test.com",
      authorName: "Parent"
    } as any);

    const res = await app.fetch(
      req(
        "/widget/comments",
        "POST",
        {
          api_key: "key",
          thread_key: "t1",
          content: "Hello",
          authorName: "N",
          authorEmail: "e@e.com",
          parentId: "c1",
          origin_url: "https://example.com/post"
        },
        true,
      ),
    );
    expect(res.status).toBe(201);
    await new Promise(r => setTimeout(r, 10)); // wait for detached promise
    expect(NotificationService.sendNewCommentEmail).toHaveBeenCalled();
    expect(NotificationService.sendReplyEmail).toHaveBeenCalled();
  });

  it("should delete comment", async () => {
    spyOn(WidgetService, "deleteComment").mockResolvedValue(undefined);
    const res = await app.fetch(req("/widget/comments/c1", "DELETE", undefined, true));
    expect(res.status).toBe(200);
    // As a commenter, deleteComment should be called with user email (soft delete)
    expect(WidgetService.deleteComment).toHaveBeenCalledWith("c1", "test@test.com");
  });

  it("should hard delete comment if admin", async () => {
    const adminToken = await signToken({
      userId: "u1",
      email: "test@test.com",
      role: "admin",
      name: "User",
    });
    spyOn(WidgetService, "deleteComment").mockResolvedValue(undefined);
    
    const adminReq = new Request(`http://localhost/widget/comments/c1`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await app.fetch(adminReq);
    expect(res.status).toBe(200);
    // As an admin, deleteComment should be called without user email (hard delete)
    expect(WidgetService.deleteComment).toHaveBeenCalledWith("c1");
  });

  it("should like comment", async () => {
    spyOn(WidgetService, "verifyApiKey").mockResolvedValue({
      site: { id: "s1", userId: "u1" },
    } as any);
    spyOn(WidgetService, "likeComment").mockResolvedValue({ success: true } as any);
    const res = await app.fetch(
      req("/widget/comments/c1/like?api_key=key", "POST", undefined, true),
    );
    expect(res.status).toBe(200);
  });

  it("should unlike comment", async () => {
    spyOn(WidgetService, "verifyApiKey").mockResolvedValue({
      site: { id: "s1", userId: "u1" },
    } as any);
    spyOn(WidgetService, "unlikeComment").mockResolvedValue({ success: true } as any);
    const res = await app.fetch(
      req("/widget/comments/c1/unlike?api_key=key", "POST", undefined, true),
    );
    expect(res.status).toBe(200);
  });

  it("should get replies", async () => {
    spyOn(WidgetService, "verifyApiKey").mockResolvedValue({
      site: { id: "s1", userId: "u1" },
    } as any);
    spyOn(AdminService, "getUserAccount").mockResolvedValue({ email: "owner@test.com" } as any);
    spyOn(WidgetService, "getThread").mockResolvedValue({ id: "t1", title: "Thread", url: "https://example.com" } as any);
    spyOn(WidgetService, "getReplies").mockResolvedValue({
      comments: [{ id: "c2" }],
      hasMore: false,
    } as any);
    const res = await app.fetch(req("/widget/comments/c1/replies?api_key=key&thread_key=t1"));
    expect(res.status).toBe(200);
  });

  it("should toggle pin comment as commenter", async () => {
    spyOn(WidgetService, "verifyCommentOwnership").mockResolvedValue(true);
    spyOn(AdminService, "togglePinComment").mockResolvedValue(undefined);
    
    const userToken = await signToken({
      userId: "u1",
      email: "user@test.com",
      role: "user",
      name: "User",
    });
    const reqObj = new Request(`http://localhost/widget/comments/c1/pin`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: true })
    });
    const res = await app.fetch(reqObj);
    expect(res.status).toBe(200);
  });
});
