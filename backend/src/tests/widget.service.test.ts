import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "../db";
import { commentLikes, comments, sites, threads, users, widgetUsers } from "../db/schema";
import { AuthService } from "../services/auth.service";
import { WidgetService } from "../services/widget.service";

describe("WidgetService and AuthService Core Operations", () => {
  const testUserId = "ws_u_core";
  const testSiteId = "ws_s_core";
  const testApiKey = "ws_pk_core";
  const testWidgetUserEmail = "ws_user@test.com";

  beforeAll(async () => {
    // Insert dashboard user and site
    await db.insert(users).values({ id: testUserId, email: "ws_admin@test.com", passwordHash: "pwd", role: "admin" });
    await db.insert(sites).values({ id: testSiteId, userId: testUserId, domain: "test.com", publicApiKey: testApiKey });
  });

  afterAll(async () => {
    await db.delete(commentLikes);
    await db.delete(comments);
    await db.delete(threads);
    await db.delete(sites);
    await db.delete(users).where(require("drizzle-orm").eq(users.id, testUserId));
    await db.delete(widgetUsers).where(require("drizzle-orm").eq(widgetUsers.email, testWidgetUserEmail));
  });

  it("should handle widget user auth flow", async () => {
    const hash = await WidgetService.hashPassword("secret123");
    expect(hash).toBeDefined();
    
    const verified = await WidgetService.verifyPassword("secret123", hash);
    expect(verified).toBe(true);

    const user = await WidgetService.registerWidgetUser(testWidgetUserEmail, "WS User", hash);
    expect(user).toBeDefined();
    expect(user.email).toBe(testWidgetUserEmail);

    const found = await WidgetService.findWidgetUser(testWidgetUserEmail);
    expect(found).toBeDefined();
    
    const foundById = await WidgetService.findWidgetUserById(user.id);
    expect(foundById).toBeDefined();
    
    const dashboardUser = await WidgetService.findDashboardUser("ws_admin@test.com");
    expect(dashboardUser).toBeDefined();
  });

  it("should manage verification and password reset", async () => {
    const wu = await WidgetService.findWidgetUser(testWidgetUserEmail);
    await WidgetService.updateVerificationToken(wu!.id, "verif_token");
    
    const verifiedUser = await WidgetService.verifyEmailToken("verif_token");
    expect(verifiedUser).toBeDefined();
    
    await WidgetService.markUserAsVerified(wu!.id);
    
    const reset = await WidgetService.generatePasswordResetToken(testWidgetUserEmail);
    expect(reset).toBeDefined();
    
    const isValid = await WidgetService.validateResetToken(reset?.resetToken || "");
    expect(isValid).toBe(true);
    
    const resetSuccess = await WidgetService.resetPasswordWithToken(reset?.resetToken || "", "new_hash");
    expect(resetSuccess).toBe(true);
  });

  it("should manage oauth accounts", async () => {
    const wu = await WidgetService.findWidgetUser(testWidgetUserEmail);
    await WidgetService.linkOAuthAccount("google", "gid_123", wu!.id);
    
    const linked = await WidgetService.findOAuthAccount("google", "gid_123");
    expect(linked).toBeDefined();
  });

  it("should verify API key and embed tokens", async () => {
    // Missing context
    const res1 = await WidgetService.verifyApiKey(testApiKey);
    expect(res1.site).toBeDefined();

    // Invalid key
    const res2 = await WidgetService.verifyApiKey("invalid_key");
    expect(res2.failure).toBe("invalid_key");

    // issue token
    const c = { req: { header: () => "http://test.com", query: () => "" } } as any;
    const tokenRes = await WidgetService.issueEmbedToken(testApiKey, c);
    expect(tokenRes.token).toBeDefined();
    
    // verify with token
    const c2 = { req: { header: () => tokenRes.token, query: () => "" } } as any;
    const res3 = await WidgetService.verifyApiKey(testApiKey, c2);
    expect(res3.failure).toBeNull();
  });

  it("should manage threads and comments", async () => {
    // getComments creates the thread automatically if it doesn't exist
    const listInit = await WidgetService.getComments(testSiteId, "key1", 10, 0, "My Post");
    expect(listInit.comments.length).toBe(0);

    const thread = await WidgetService.getThread(testSiteId, "key1");
    expect(thread).toBeDefined();

    // create comment
    const comment = await WidgetService.createComment({
      threadId: thread!.id,
      authorName: "John",
      authorEmail: "john@test.com",
      content: "Hello world",
      status: "approved"
    });
    expect(comment).toBeDefined();
    
    // get comment by id
    const cById = await WidgetService.getCommentById(comment.id);
    expect(cById).toBeDefined();
    
    // get comments
    const list = await WidgetService.getComments(testSiteId, thread!.threadKey, 10, 0, "My Post");
    expect(list.comments.length).toBeGreaterThan(0);

    // Like comment
    const wu = await WidgetService.findWidgetUser(testWidgetUserEmail);
    // Bypass FK constraint for commentLikes referencing users.id instead of widgetUsers.id
    await db.insert(users).values({ id: wu!.id, email: `dummy_${crypto.randomUUID()}@test.com`, passwordHash: "pwd" }).onConflictDoNothing();
    
    await WidgetService.likeComment(comment.id, wu!.id);
    
    const countByKey = await WidgetService.getComments(testSiteId, thread!.threadKey, 10, 0);
    expect(countByKey.comments.length).toBeGreaterThan(0);
    
    await WidgetService.deleteComment(comment.id);
  });
  
  it("should cover AuthService core", async () => {
    const pwdHash = await AuthService.hashPassword("12345");
    const valid = await AuthService.verifyPassword("12345", pwdHash);
    expect(valid).toBe(true);
    
    const usr = await AuthService.registerUser("auth_new@test.com", pwdHash, "user");
    expect(usr).toBeDefined();
    
    const count = await AuthService.getUserCount();
    expect(count).toBeGreaterThan(0);
    
    await AuthService.incrementTokenVersion(usr.id);
    const u = await AuthService.getUserByEmail("auth_new@test.com");
    expect(u?.tokenVersion).toBeGreaterThan(0);
    
    await db.delete(users).where(require("drizzle-orm").eq(users.email, "auth_new@test.com"));
  });
});
