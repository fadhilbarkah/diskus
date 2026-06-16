import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "../db";
import { comments, sites, threads, users } from "../db/schema";
import { AdminService } from "../services/admin.service";

describe("AdminService Import Coverage", () => {
  it("Should import data correctly", async () => {
    // Insert a dummy user and site
    await db.insert(users).values({
      id: "u1",
      email: "u1@test.com",
      passwordHash: "hash",
      role: "admin",
      createdAt: new Date(),
    });

    const siteId = crypto.randomUUID();
    await db.insert(sites).values({
      id: siteId,
      userId: "u1",
      domain: "test-import.com",
      publicApiKey: "pk_" + siteId,
      createdAt: new Date(),
    });

    const mockData = {
      threads: [
        {
          id: "t1",
          threadKey: "index",
          title: "Home",
          createdAt: new Date().toISOString(),
        },
      ],
      comments: [
        {
          id: "c1",
          threadId: "t1",
          authorName: "John",
          authorEmail: "john@example.com",
          content: "Hello",
          htmlContent: "<p>Hello</p>",
          createdAt: new Date().toISOString(),
        },
        {
          id: "c2",
          threadId: "t1",
          parentId: "c1",
          authorName: "Jane",
          authorEmail: "jane@example.com",
          content: "Hi John",
          htmlContent: "<p>Hi John</p>",
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const result = await AdminService.importData("u1", "admin", siteId, mockData);
    expect(result).toBe(true);

    // Call again to hit the "already existing" branch
    const result2 = await AdminService.importData("u1", "admin", siteId, mockData);
    expect(result2).toBe(true);

    // Call as normal user (owner)
    const result3 = await AdminService.importData("u1", "user", siteId, mockData);
    expect(result3).toBe(true);

    // Cleanup
    await db.delete(comments);
    await db.delete(threads);
    await db.delete(sites);
    await db.delete(users).where(require("drizzle-orm").eq(users.id, "u1"));
  });

  it("Should import Disqus XML data correctly", async () => {
    await db.insert(users).values({
      id: "u2",
      email: "u2@test.com",
      passwordHash: "hash",
      role: "admin",
      createdAt: new Date(),
    });

    const siteId = crypto.randomUUID();
    await db.insert(sites).values({
      id: siteId,
      userId: "u2",
      domain: "disqus-import.com",
      publicApiKey: "pk_" + siteId,
      createdAt: new Date(),
    });

    const xmlData = `
      <disqus xmlns:dsq="http://disqus.com/disqus-internals">
        <thread dsq:id="123">
          <id>article-1</id>
          <title>My Article</title>
          <createdAt>2023-01-01T00:00:00Z</createdAt>
        </thread>
        <post dsq:id="p1">
          <message>Hello Disqus</message>
          <createdAt>2023-01-01T01:00:00Z</createdAt>
          <isDeleted>false</isDeleted>
          <isSpam>false</isSpam>
          <author>
            <name>DsqUser</name>
            <email>dsq@example.com</email>
            <username>dsquser</username>
          </author>
          <thread dsq:id="123" />
        </post>
        <post dsq:id="p2">
          <message>Reply to Disqus</message>
          <createdAt>2023-01-01T02:00:00Z</createdAt>
          <parent dsq:id="p1"/>
          <author>
            <name>DsqUser2</name>
          </author>
          <thread dsq:id="123" />
        </post>
      </disqus>
    `;

    const result = await AdminService.importDisqusData("u2", "admin", siteId, xmlData);
    expect(result).toBe(true);

    // Call again to hit the "already existing" branch
    const result2 = await AdminService.importDisqusData("u2", "admin", siteId, xmlData);
    expect(result2).toBe(true);

    // Call as normal user (owner)
    const result3 = await AdminService.importDisqusData("u2", "user", siteId, xmlData);
    expect(result3).toBe(true);

    // Cleanup
    await db.delete(comments);
    await db.delete(threads);
    await db.delete(sites);
    await db.delete(users).where(require("drizzle-orm").eq(users.id, "u2"));
  });
});

describe("AdminService Core Operations", () => {
  const testUserId = "admin_u_core";
  let testSiteId = "";
  
  beforeAll(async () => {
    await db.insert(users).values({ id: testUserId, email: "core@admin.com", passwordHash: "pwd", role: "admin" });
  });

  afterAll(async () => {
    await db.delete(comments);
    await db.delete(threads);
    await db.delete(sites);
    await db.delete(users).where(require("drizzle-orm").eq(users.id, testUserId));
  });

  it("should create, read, update, and delete sites", async () => {
    // Create
    const newSite = await AdminService.createSite(testUserId, "core-site.com");
    expect(newSite).toBeDefined();
    expect(newSite.domain).toBe("core-site.com");
    testSiteId = newSite.id;

    // Read
    const sitesList = await AdminService.getUserSites(testUserId);
    expect(sitesList.length).toBeGreaterThan(0);
    expect(sitesList.find((s) => s.id === testSiteId)).toBeDefined();

    // Update
    await AdminService.updateSite(testSiteId, testUserId, { domain: "updated-core.com" });
    const sitesListCheck = await AdminService.getUserSites(testUserId);
    expect(sitesListCheck.find(s => s.domain === "updated-core.com")).toBeDefined();

    // Analytics (empty)
    const analytics = await AdminService.getAnalyticsSummary(testUserId, "admin");
    expect(analytics).toBeDefined();
    expect(analytics.total).toBeGreaterThanOrEqual(0);

    // Delete
    await AdminService.deleteSite(testSiteId, testUserId);
    
    const sitesListAfter = await AdminService.getUserSites(testUserId);
    expect(sitesListAfter.find((s) => s.id === testSiteId)).toBeUndefined();
  });

  it("should manage user account", async () => {
    const acc = await AdminService.getUserAccount(testUserId);
    expect(acc).toBeDefined();
    expect(acc?.email).toBe("core@admin.com");

    const updated = await AdminService.updateUserAccount(testUserId, acc, { email: "core2@admin.com", name: "Core User" });
    
    const accUpdated = await AdminService.getUserAccount(testUserId);
    expect(accUpdated?.email).toBe("core2@admin.com");
    expect(accUpdated?.name).toBe("Core User");
  });

  it("should manage comments", async () => {
    // Setup site, thread, comment
    const site = await AdminService.createSite(testUserId, "comment-test.com");
    await db.insert(threads).values({ id: "t_core", siteId: site.id, threadKey: "key", title: "Test" });
    await db.insert(comments).values([
      { id: "c_core1", threadId: "t_core", authorName: "A", authorEmail: "a@a.com", content: "C1", htmlContent: "C1", status: "pending" },
      { id: "c_core2", threadId: "t_core", authorName: "B", authorEmail: "b@b.com", content: "C2", htmlContent: "C2", status: "pending" }
    ]);

    // getComments
    const list = await AdminService.getComments(testUserId, "admin", "pending", site.id);
    expect(list.length).toBe(2);

    // verify ownership
    const own = await AdminService.verifyCommentOwnershipByUser("c_core1", testUserId);
    expect(own).toBeDefined();

    // toggle pin
    await AdminService.togglePinComment("c_core1", true);
    const pinnedC = await db.select().from(comments).where(require("drizzle-orm").eq(comments.id, "c_core1")).get();
    expect(pinnedC?.isPinned).toBe(true);

    // update status bulk
    await AdminService.updateCommentsStatus(["c_core1", "c_core2"], "approved", testUserId, "admin");
    const updatedC = await db.select().from(comments).where(require("drizzle-orm").inArray(comments.id, ["c_core1", "c_core2"])).all();
    expect(updatedC[0].status).toBe("approved");

    // delete bulk
    await AdminService.deleteCommentsBulk(["c_core1", "c_core2"], testUserId, "admin");
    const deletedC = await db.select().from(comments).where(require("drizzle-orm").inArray(comments.id, ["c_core1", "c_core2"])).all();
    expect(deletedC.length).toBe(0);
  });
});
