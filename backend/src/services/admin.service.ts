import crypto from "node:crypto";
import { aliasedTable, and, desc, eq, inArray, not } from "drizzle-orm";
import { db } from "../db";
import { comments, sites, threads, users, widgetUsers } from "../db/schema";
import { sanitizeHtml } from "../utils/html";

export class AdminService {
  static async getUserSites(userId: string) {
    return await db.select().from(sites).where(eq(sites.userId, userId)).all();
  }

  static async createSite(userId: string, domain: string) {
    const id = crypto.randomUUID();
    const publicApiKey = crypto.randomBytes(24).toString("hex");

    await db.insert(sites).values({
      id,
      userId,
      domain,
      publicApiKey,
    });
    return { id, userId, domain, publicApiKey };
  }

  static async deleteSite(id: string, userId: string) {
    await db.delete(sites).where(and(eq(sites.id, id), eq(sites.userId, userId)));
  }

  static async updateSite(id: string, userId: string, updateData: any) {
    if (Object.keys(updateData).length > 0) {
      await db
        .update(sites)
        .set(updateData)
        .where(and(eq(sites.id, id), eq(sites.userId, userId)));
    }
  }

  static async getAnalyticsSummary(userId: string, role: string, siteId?: string) {
    let q = db
      .select({
        id: comments.id,
        status: comments.status,
      })
      .from(comments);

    if (role !== "admin" || siteId) {
      const joinQ = db
        .select({
          id: comments.id,
          status: comments.status,
        })
        .from(comments)
        .innerJoin(threads, eq(comments.threadId, threads.id))
        .innerJoin(sites, eq(threads.siteId, sites.id));

      const conditions = [];
      if (role !== "admin") conditions.push(eq(sites.userId, userId));
      if (siteId) conditions.push(eq(sites.id, siteId));

      q = joinQ.where(and(...conditions)) as any;
    }

    const allComments = await q.all();

    return {
      total: allComments.length,
      pending: allComments.filter((cm) => cm.status === "pending").length,
      approved: allComments.filter((cm) => cm.status === "approved").length,
      spam: allComments.filter((cm) => cm.status === "spam").length,
      trash: allComments.filter((cm) => cm.status === "trash").length,
    };
  }

  static async getComments(
    userId: string,
    role: string,
    statusFilter?: string,
    siteId?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const conditions = [];
    if (statusFilter && statusFilter !== "all")
      conditions.push(eq(comments.status, statusFilter as any));
    if (role !== "admin") conditions.push(eq(sites.userId, userId));
    if (siteId) conditions.push(eq(sites.id, siteId));

    const parentComments = aliasedTable(comments, "parentComments");

    let q = db
      .select({
        id: comments.id,
        authorName: comments.authorName,
        authorEmail: comments.authorEmail,
        content: comments.content,
        htmlContent: comments.htmlContent,
        status: comments.status,
        createdAt: comments.createdAt,
        parentId: comments.parentId,
        isPinned: comments.isPinned,
        threadTitle: threads.title,
        threadKey: threads.threadKey,
        parentContent: parentComments.content,
      })
      .from(comments)
      .leftJoin(threads, eq(comments.threadId, threads.id))
      .leftJoin(sites, eq(threads.siteId, sites.id))
      .leftJoin(parentComments, eq(comments.parentId, parentComments.id));

    if (conditions.length > 0) {
      q = q.where(and(...conditions)) as typeof q;
    }

    const result = await q.orderBy(desc(comments.createdAt)).limit(limit).offset(offset).all();
    
    return result as {
      id: string;
      authorName: string;
      authorEmail: string;
      content: string;
      htmlContent: string;
      status: string;
      createdAt: Date | string;
      parentId: string | null;
      isPinned: boolean;
      threadTitle: string | null;
      threadKey: string | null;
      parentContent: string | null;
    }[];
  }

  static async updateCommentsStatus(ids: string[], status: any, userId: string, role: string) {
    if (ids.length === 0) return;
    if (role === "admin") {
      await db.update(comments).set({ status }).where(inArray(comments.id, ids));
    } else {
      const userComments = await db
        .select({ id: comments.id })
        .from(comments)
        .innerJoin(threads, eq(comments.threadId, threads.id))
        .innerJoin(sites, eq(threads.siteId, sites.id))
        .where(and(inArray(comments.id, ids), eq(sites.userId, userId)))
        .all();

      const validIds = userComments.map((c) => c.id);
      if (validIds.length > 0) {
        await db.update(comments).set({ status }).where(inArray(comments.id, validIds));
      }
    }
  }

  static async deleteCommentsBulk(ids: string[], userId: string, role: string) {
    if (ids.length === 0) return;

    const getAllDescendantIds = async (parentIds: string[]): Promise<string[]> => {
      if (parentIds.length === 0) return [];
      const children = await db
        .select({ id: comments.id })
        .from(comments)
        .where(inArray(comments.parentId, parentIds))
        .all();
      const childIds = children.map((c) => c.id);
      if (childIds.length === 0) return [];
      return [...childIds, ...(await getAllDescendantIds(childIds))];
    };

    let validIds = ids;

    if (role !== "admin") {
      const userComments = await db
        .select({ id: comments.id })
        .from(comments)
        .innerJoin(threads, eq(comments.threadId, threads.id))
        .innerJoin(sites, eq(threads.siteId, sites.id))
        .where(and(inArray(comments.id, ids), eq(sites.userId, userId)))
        .all();
      validIds = userComments.map((c) => c.id);
    }

    if (validIds.length > 0) {
      const descendantIds = await getAllDescendantIds(validIds);
      const allIdsToDelete = Array.from(new Set([...validIds, ...descendantIds]));

      // SQLite has a variable limit, so chunking is safe if deleting thousands, but `inArray` handles arrays well for typical sizes.
      // Drizzle ORM translates `inArray` nicely.
      await db.delete(comments).where(inArray(comments.id, allIdsToDelete));
    }
  }

  static async getUserAccount(userId: string) {
    return await db.select().from(users).where(eq(users.id, userId)).get();
  }

  static async updateUserAccount(userId: string, dbUser: any, updateData: any) {
    if (Object.keys(updateData).length > 0) {
      await db.update(users).set(updateData).where(eq(users.id, userId));
      if (updateData.name || updateData.email) {
        await db
          .update(comments)
          .set({
            ...(updateData.name ? { authorName: updateData.name } : {}),
            ...(updateData.email ? { authorEmail: updateData.email } : {}),
          })
          .where(eq(comments.authorEmail, dbUser.email));
      }
    }
  }

  static async exportData(userId: string, role: string, siteId: string) {
    if (role !== "admin") {
      const site = await db
        .select()
        .from(sites)
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
        .get();
      if (!site) return null;
    }

    const siteThreads = await db.select().from(threads).where(eq(threads.siteId, siteId)).all();
    const threadIds = siteThreads.map((t) => t.id);

    let siteComments: any[] = [];
    if (threadIds.length > 0) {
      siteComments = await db
        .select()
        .from(comments)
        .where(and(inArray(comments.threadId, threadIds), not(eq(comments.status, "trash"))))
        .all();
    }

    return { siteId, threads: siteThreads, comments: siteComments };
  }

  static async importData(userId: string, role: string, siteId: string, data: any) {
    if (role !== "admin") {
      const site = await db
        .select()
        .from(sites)
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
        .get();
      if (!site) return false;
    }

    const threadIdMap: Record<string, string> = {};
    const commentIdMap: Record<string, string> = {};

    if (data.threads && data.threads.length > 0) {
      for (const t of data.threads) {
        const existing = await db
          .select()
          .from(threads)
          .where(and(eq(threads.siteId, siteId), eq(threads.threadKey, t.threadKey)))
          .get();
        if (!existing) {
          const newThreadId = crypto.randomUUID();
          await db.insert(threads).values({
            id: newThreadId,
            siteId: siteId,
            threadKey: t.threadKey,
            title: t.title,
            createdAt: new Date(t.createdAt),
          });
          threadIdMap[t.id] = newThreadId;
        } else {
          threadIdMap[t.id] = existing.id;
        }
      }
    }

    if (data.comments && data.comments.length > 0) {
      // Sort comments by createdAt so parents are inserted before children
      const sortedComments = [...data.comments].sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      for (const c of sortedComments) {
        const targetThreadId = threadIdMap[c.threadId] || c.threadId;

        // Prevent duplicate imports of the same comment by checking threadId + authorEmail + content
        const existing = await db
          .select()
          .from(comments)
          .where(
            and(
              eq(comments.threadId, targetThreadId),
              eq(comments.authorEmail, c.authorEmail),
              eq(comments.content, c.content),
            ),
          )
          .get();

        if (!existing) {
          const newCommentId = crypto.randomUUID();
          commentIdMap[c.id] = newCommentId;

          // Re-sanitize htmlContent on import to prevent stored XSS via imported data
          const safeHtmlContent = sanitizeHtml(c.htmlContent);

          await db.insert(comments).values({
            id: newCommentId,
            threadId: targetThreadId,
            parentId: c.parentId ? commentIdMap[c.parentId] || c.parentId : null,
            authorName: c.authorName,
            authorEmail: c.authorEmail,
            content: c.content,
            htmlContent: safeHtmlContent,
            status: c.status || "approved",
            likesCount: c.likesCount || 0,
            createdAt: new Date(c.createdAt),
          });
        } else {
          commentIdMap[c.id] = existing.id;
        }
      }
    }
    return true;
  }

  static async importDisqusData(userId: string, role: string, siteId: string, xmlString: string) {
    if (role !== "admin") {
      const site = await db
        .select()
        .from(sites)
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
        .get();
      if (!site) return false;
    }

    const { XMLParser } = await import("fast-xml-parser");
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const parsed = parser.parse(xmlString);
    if (!parsed?.disqus) return false;

    // Normalize threads and posts to arrays
    let disqusThreads = parsed.disqus.thread || [];
    let disqusPosts = parsed.disqus.post || [];
    if (!Array.isArray(disqusThreads)) disqusThreads = [disqusThreads];
    if (!Array.isArray(disqusPosts)) disqusPosts = [disqusPosts];

    // Build internal mapping for threads
    const dsqThreadIdMap: Record<string, string> = {}; // Disqus internal @dsq:id -> Our DB ID
    for (const t of disqusThreads) {
      const dsqId = t["@_dsq:id"];
      // Use <id> if available, fallback to <link> or <title>
      const threadKey = t.id || t.link || t.title || `disqus-thread-${dsqId}`;
      const title = t.title || threadKey;
      const createdAt = t.createdAt ? new Date(t.createdAt) : new Date();

      const existing = await db
        .select()
        .from(threads)
        .where(and(eq(threads.siteId, siteId), eq(threads.threadKey, threadKey)))
        .get();
      if (!existing) {
        const newThreadId = crypto.randomUUID();
        await db.insert(threads).values({
          id: newThreadId,
          siteId: siteId,
          threadKey,
          title,
          createdAt,
        });
        dsqThreadIdMap[dsqId] = newThreadId;
      } else {
        dsqThreadIdMap[dsqId] = existing.id;
      }
    }

    // Process posts
    const dsqPostIdMap: Record<string, string> = {}; // Disqus internal @dsq:id -> Our DB ID

    // Sort posts chronologically to ensure parents are processed before children
    disqusPosts.sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });

    for (const p of disqusPosts) {
      const dsqId = p["@_dsq:id"];

      // Thread ID resolution
      let threadDsqId = p.thread?.["@_dsq:id"];
      // Sometimes <thread> is just the text content if not using attribute
      if (!threadDsqId && typeof p.thread === "string") {
        // Need to match thread by the text node which is the <id> in thread
        const matchedThread = disqusThreads.find((t: any) => t.id === p.thread);
        if (matchedThread) {
          threadDsqId = matchedThread["@_dsq:id"];
        }
      } else if (!threadDsqId && p.thread && p.thread["#text"]) {
        const matchedThread = disqusThreads.find((t: any) => t.id === p.thread["#text"]);
        if (matchedThread) {
          threadDsqId = matchedThread["@_dsq:id"];
        }
      }

      if (!threadDsqId) continue; // Skip orphan posts
      const targetThreadId = dsqThreadIdMap[threadDsqId];
      if (!targetThreadId) continue;

      // Status
      let status: "pending" | "approved" | "spam" | "trash" = "approved";
      if (p.isSpam === true || p.isSpam === "true") status = "spam";
      if (p.isDeleted === true || p.isDeleted === "true") status = "trash";

      // Author Info
      const authorName = p.author?.name || "Anonymous";
      const authorUsername = p.author?.username || "anonymous";
      // Disqus XML may omit emails for privacy, fallback to a dummy email
      const authorEmail = p.author?.email || `${authorUsername}@guest.disqus.com`;

      // Content (Disqus message is HTML)
      const rawContent = p.message || "";
      const safeHtmlContent = sanitizeHtml(rawContent);

      // Parent ID
      let parentDbId = null;
      if (p.parent) {
        const parentDsqId = typeof p.parent === "string" ? p.parent : p.parent["@_dsq:id"];
        if (parentDsqId && dsqPostIdMap[parentDsqId]) {
          parentDbId = dsqPostIdMap[parentDsqId];
        }
      }

      const createdAt = p.createdAt ? new Date(p.createdAt) : new Date();

      // Check if comment exists to prevent duplicate imports
      const existing = await db
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.threadId, targetThreadId),
            eq(comments.authorEmail, authorEmail),
            eq(comments.content, rawContent),
          ),
        )
        .get();

      if (!existing) {
        const newCommentId = crypto.randomUUID();
        dsqPostIdMap[dsqId] = newCommentId;

        await db.insert(comments).values({
          id: newCommentId,
          threadId: targetThreadId,
          parentId: parentDbId,
          authorName,
          authorEmail,
          content: rawContent, // Store raw HTML in content since it's an import
          htmlContent: safeHtmlContent,
          status,
          likesCount: 0,
          createdAt,
        });
      } else {
        dsqPostIdMap[dsqId] = existing.id;
      }
    }
    return true;
  }

  static async togglePinComment(id: string, isPinned: boolean) {
    await db.update(comments).set({ isPinned }).where(eq(comments.id, id));
  }

  /** Verify that a comment belongs to a site owned by the given user */
  static async verifyCommentOwnershipByUser(commentId: string, userId: string): Promise<boolean> {
    const result = await db
      .select({ id: comments.id })
      .from(comments)
      .innerJoin(threads, eq(comments.threadId, threads.id))
      .innerJoin(sites, eq(threads.siteId, sites.id))
      .where(and(eq(comments.id, commentId), eq(sites.userId, userId)))
      .get();
    return !!result;
  }

  static async getWidgetUsers() {
    return await db
      .select({
        id: widgetUsers.id,
        name: widgetUsers.name,
        email: widgetUsers.email,
        isVerified: widgetUsers.isVerified,
        createdAt: widgetUsers.createdAt,
      })
      .from(widgetUsers)
      .orderBy(desc(widgetUsers.createdAt))
      .all();
  }

  static async deleteWidgetUser(id: string) {
    await db.delete(widgetUsers).where(eq(widgetUsers.id, id));
  }
}
